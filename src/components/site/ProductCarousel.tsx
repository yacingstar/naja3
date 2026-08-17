"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/site/ProductCard";
import type { FeaturedProduct } from "@/lib/products";

// Horizontal carousel for the homepage's "Nos créations" preview
// (/boutique keeps the plain grid since that page is "browse everything,"
// not a curated preview). No arrows — client asked for it to work purely
// like a phone: touch-swipe (native, `overflow-x-auto` handles this with
// zero JS and real OS-level momentum) plus click-and-drag with a mouse,
// which browsers don't support natively, so it's hand-rolled below. Cards
// are a fixed width and `shrink-0`, so however many fit a given viewport
// is a function of its width, not a hardcoded count.
//
// Full-bleed: CatalogPreview.tsx deliberately does NOT wrap this in the
// site's usual `max-w-6xl mx-auto px-6` — the first/last card should sit
// near the actual screen edges, not centered with big margins either
// side. `pl-8/pr-8` on the scroller below is the only edge gap — slightly
// more than the site's usual px-6, because these cards sit at a resting
// tilt (ProductCard.tsx's --card-rotate) and a rotated rectangle's
// bounding box is wider than the rectangle itself; px-6 measured about
// 13px short and let the first card's corner render off the left edge of
// the viewport entirely (confirmed via its rendered x position, not
// guessed).

// Fling tuning. DECAY is per 16.67ms (one 60Hz frame) and applied
// time-scaled, so the glide is identical on a 60Hz and a 144Hz display.
const DECAY = 0.94;
const MIN_VELOCITY = 0.02; // px/ms — below this the glide is imperceptible
const DRAG_THRESHOLD = 4; // px of travel before it counts as a drag, not a click
const VELOCITY_SMOOTHING = 0.7; // weight on the newest sample
const STALE_MS = 80; // pointer held still this long before release = no fling
// Ceiling on fling speed (px/ms). A real mouse flick lands around 1-3;
// this only clips freak samples (a single event pair a fraction of a ms
// apart) that would otherwise hurl the strip from end to end. Phones cap
// their fling velocity for the same reason.
const MAX_VELOCITY = 5;

// Dragging itself is direct manipulation and always stays 1:1 with the
// pointer. The parts that keep moving on their own after the user lets go
// — the glide and the smooth settle — are the parts reduced-motion asks us
// to drop, matching how globals.css neutralizes the site's other motion.
function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function ProductCarousel({ products }: { products: FeaturedProduct[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Drives the cursor and — critically — swaps `scroll-smooth` for
  // `scroll-auto`. `scroll-behavior: smooth` turns every per-frame
  // scrollLeft assignment into its own easing animation, which makes both
  // the drag and the fling lag behind the pointer. Stays true for the
  // whole gesture, fling included, not just while the button is held.
  const [active, setActive] = useState(false);

  const drag = useRef({
    pointerId: null as number | null,
    startX: 0,
    startScroll: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0, // px/ms, positive = content moving right (scrollLeft shrinking)
    moved: false,
  });
  // Read by the click-capture handler to swallow the click that fires at
  // the end of a drag; separate from `drag.moved` because it has to
  // survive being reset for the next gesture.
  const suppressClick = useRef(false);
  const frame = useRef(0);
  // Removes whichever window listeners the in-flight gesture installed —
  // held as a ref so detaching never depends on re-deriving the same
  // function identity a later render would have changed.
  const detachRef = useRef<(() => void) | null>(null);

  const stopFling = useCallback(() => {
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
  }, []);

  // Settle on the nearest card, then hand scroll-snap back to the browser.
  // Doing the final snap explicitly rather than just re-enabling
  // `snap-mandatory` and hoping: re-enabling it mid-glide makes the
  // browser yank to a snap point with no animation. Here the target we
  // scroll to already *is* a snap point, so restoring the property after
  // is a no-op and nothing jumps.
  const settle = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const max = el.scrollWidth - el.clientWidth;
    const padLeft = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
    const elLeft = el.getBoundingClientRect().left;

    let target = el.scrollLeft;
    let bestDistance = Infinity;
    for (const child of Array.from(el.children) as HTMLElement[]) {
      // Card offsets via rects + current scrollLeft, not offsetLeft —
      // offsetLeft is measured from the nearest positioned ancestor, which
      // isn't necessarily this scroller.
      const candidate =
        el.scrollLeft + (child.getBoundingClientRect().left - elLeft) - padLeft;
      const clamped = Math.max(0, Math.min(max, candidate));
      const distance = Math.abs(clamped - el.scrollLeft);
      if (distance < bestDistance) {
        bestDistance = distance;
        target = clamped;
      }
    }

    setActive(false);
    el.style.scrollSnapType = "";
    if (Math.abs(target - el.scrollLeft) > 1) {
      el.scrollTo({
        left: target,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    }
  }, []);

  const fling = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    let velocity = drag.current.velocity;
    if (Math.abs(velocity) < MIN_VELOCITY || prefersReducedMotion()) {
      settle();
      return;
    }

    const max = el.scrollWidth - el.clientWidth;
    // Seeded on the first frame rather than from a clock read here, so the
    // very first dt is a true frame interval instead of however long the
    // browser took to schedule that frame.
    let last = -1;

    function step(now: number) {
      const target = scrollerRef.current;
      if (!target) return;
      if (last < 0) last = now;
      const dt = Math.min(now - last, 50); // clamp: a dropped frame shouldn't teleport
      last = now;

      velocity *= Math.pow(DECAY, dt / 16.67);
      const next = target.scrollLeft - velocity * dt;

      if (next <= 0 || next >= max) {
        target.scrollLeft = next <= 0 ? 0 : max;
        frame.current = 0;
        settle();
        return;
      }

      target.scrollLeft = next;

      if (Math.abs(velocity) > MIN_VELOCITY) {
        frame.current = requestAnimationFrame(step);
      } else {
        frame.current = 0;
        settle();
      }
    }

    frame.current = requestAnimationFrame(step);
  }, [settle]);

  function handlePointerDown(e: React.PointerEvent) {
    // Touch and pen are left entirely alone — native overflow scrolling
    // already gives them a better swipe (with OS momentum and rubber-band)
    // than anything reimplemented here. Mouse only, primary button only.
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;

    stopFling();

    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      lastX: e.clientX,
      // Event timeStamps, not performance.now(): same time origin, but a
      // pure read of the event rather than an impure call (which React's
      // purity lint rightly rejects inside a component body). The fling
      // loop below likewise uses the timestamp rAF hands it.
      lastTime: e.timeStamp,
      velocity: 0,
      moved: false,
    };

    // Move/up are bound on `window`, not on this element, and pointer
    // capture is deliberately never taken. Two reasons, both measured:
    //   - Capturing on press makes Chrome retarget the following `click` to
    //     this scroller instead of the card's <a>, so plain clicks stop
    //     opening products at all.
    //   - Element-bound handlers only fire while the cursor is over the
    //     strip, so a gesture that strays above or below it dies halfway
    //     (the old code made this worse by ending the drag on mouseleave).
    // Window listeners sidestep both: the click keeps its natural target,
    // and the drag follows the pointer anywhere on the page.
    detachRef.current?.();
    const move = onWindowMove;
    const up = onWindowUp;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    detachRef.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      detachRef.current = null;
    };

    setActive(true);
    el.style.scrollSnapType = "none";
  }

  function onWindowMove(e: PointerEvent) {
    const state = drag.current;
    if (state.pointerId !== e.pointerId) return;
    const el = scrollerRef.current;
    if (!el) return;

    const now = e.timeStamp;
    const dt = now - state.lastTime;
    const dx = e.clientX - state.startX;

    if (!state.moved && Math.abs(dx) > DRAG_THRESHOLD) {
      state.moved = true;
      suppressClick.current = true;
    }

    el.scrollLeft = state.startScroll - dx;

    if (dt > 0) {
      const sample = (e.clientX - state.lastX) / dt;
      // Exponential moving average — a single jittery last sample
      // shouldn't decide the whole fling.
      const smoothed = state.moved
        ? sample * VELOCITY_SMOOTHING + state.velocity * (1 - VELOCITY_SMOOTHING)
        : 0;
      state.velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, smoothed));
      state.lastX = e.clientX;
      state.lastTime = now;
    }
  }

  function onWindowUp(e: PointerEvent) {
    const state = drag.current;
    if (state.pointerId !== e.pointerId) return;
    const el = scrollerRef.current;

    detachRef.current?.();
    state.pointerId = null;

    // Dragged somewhere, then paused before letting go = "place it here",
    // not a throw. Without this the stored velocity from before the pause
    // fires off a fling the user didn't ask for.
    if (e.timeStamp - state.lastTime > STALE_MS) state.velocity = 0;

    if (!state.moved) {
      // A plain click: nothing to glide or settle, and leaving snap
      // disabled here would strand it off-axis.
      setActive(false);
      if (el) el.style.scrollSnapType = "";
      return;
    }

    fling();
  }

  // A drag that scrolled the strip shouldn't also open the card it started
  // on. Captured before it reaches any child link and swallowed once.
  function handleClickCapture(e: React.MouseEvent) {
    if (suppressClick.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick.current = false;
    }
  }

  // Unmounting mid-gesture (navigating away on a card click) would
  // otherwise leave the window listeners and a running fling behind.
  useEffect(
    () => () => {
      stopFling();
      detachRef.current?.();
    },
    [stopFling],
  );

  return (
    <div
      ref={scrollerRef}
      onPointerDown={handlePointerDown}
      onClickCapture={handleClickCapture}
      // THE bug behind "drag doesn't work": card roots are <a> and hold an
      // <img>, both of which browsers make `draggable` by default. The
      // first mousemove started a native HTML5 link/image drag, which
      // swallows every mousemove after it — measured as a 300px drag
      // moving the strip 25px and then freezing. Cancelling dragstart
      // hands the gesture back to the handlers above.
      onDragStart={(e) => e.preventDefault()}
      className={`scrollbar-hidden flex snap-x snap-mandatory gap-12 overflow-x-auto scroll-pr-8 scroll-pl-8 pt-6 pr-8 pb-8 pl-8 select-none ${
        active ? "cursor-grabbing scroll-auto" : "cursor-grab scroll-smooth"
      }`}
    >
      {products.map((product, index) => (
        <div key={product.id} className="w-60 shrink-0 snap-start sm:w-72 lg:w-80">
          <ProductCard product={product} index={index} />
        </div>
      ))}
    </div>
  );
}
