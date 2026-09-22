"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { RETOURS } from "@/lib/accueil";

// A deck you throw aside, the way people already swipe on their phone. Pointer
// events rather than touch events: one code path covers the thumb and the
// mouse, and the arrows keep it reachable for anyone who cannot drag at all.
export function Retours({ encre, encreDouce, bord }: { encre: string; encreDouce: string; bord: string }) {
  const [haut, setHaut] = useState(0);
  const depart = useRef<number | null>(null);
  const pile = useRef<HTMLDivElement>(null);

  const n = RETOURS.length;

  function carte(i: number): HTMLElement | null {
    return pile.current?.querySelector<HTMLElement>(`[data-carte="${i}"]`) ?? null;
  }

  function avancer(sens: 1 | -1) {
    const suivant = (haut + (sens > 0 ? 1 : n - 1)) % n;
    const el = carte(haut);
    if (!el) {
      setHaut(suivant);
      return;
    }
    import("gsap").then(({ gsap }) => {
      gsap.to(el, {
        x: sens * 620,
        rotate: sens * 16,
        opacity: 0,
        duration: 0.34,
        ease: "power2.in",
        onComplete: () => {
          gsap.set(el, { x: 0, rotate: 0, opacity: 1 });
          setHaut(suivant);
        },
      });
    });
  }

  function onDown(e: React.PointerEvent) {
    depart.current = e.clientX;
  }

  function onMove(e: React.PointerEvent) {
    if (depart.current === null) return;
    const dx = e.clientX - depart.current;
    const el = carte(haut);
    if (el) import("gsap").then(({ gsap }) => gsap.set(el, { x: dx, rotate: dx * 0.04 }));
  }

  function onUp(e: React.PointerEvent) {
    if (depart.current === null) return;
    const dx = e.clientX - depart.current;
    depart.current = null;
    const el = carte(haut);
    // 70px rather than a tap: below that it is a scroll that brushed the card.
    if (Math.abs(dx) > 70) avancer(dx > 0 ? 1 : -1);
    else if (el) import("gsap").then(({ gsap }) => gsap.to(el, { x: 0, rotate: 0, duration: 0.35, ease: "back.out(2)" }));
  }

  const courant = RETOURS[haut];

  return (
    <div className="px-5 pt-12 sm:px-12 sm:pt-16">
      <h2
        data-apparait
        className="font-heading text-[42px] leading-none font-bold tracking-[-.02em] sm:text-[54px]"
        style={{ color: encre }}
      >
        Retours lumineux.
      </h2>
      <p className="mt-3 max-w-[700px] text-base font-medium sm:text-lg" style={{ color: encreDouce }}>
        Vos photos, chez vous, le soir. Faites glisser les cartes du doigt — c&apos;est la meilleure preuve
        qu&apos;on puisse montrer, et c&apos;est vous qui l&apos;avez faite.
      </p>

      <div data-apparait className="mt-6 flex items-center justify-center gap-4 sm:gap-7">
        <button
          type="button"
          onClick={() => avancer(-1)}
          aria-label="Photo précédente"
          className="hidden h-[54px] w-[54px] shrink-0 cursor-pointer rounded-full border-[3px] font-heading text-2xl transition active:scale-95 sm:block"
          style={{ color: encre, borderColor: bord }}
        >
          ‹
        </button>

        <div
          ref={pile}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          className="relative h-[430px] w-full max-w-[400px] touch-pan-y select-none sm:h-[500px]"
        >
          {RETOURS.map((r, i) => {
            const rang = (i - haut + n) % n;
            const visible = rang < 3;
            return (
              <div
                key={r.src}
                data-carte={i}
                aria-hidden={!visible}
                className="absolute inset-0 overflow-hidden rounded-[1.75rem] border-4 border-encre bg-papier transition-[transform,opacity] duration-300"
                style={{
                  zIndex: n - rang,
                  opacity: visible ? 1 : 0,
                  pointerEvents: rang === 0 ? "auto" : "none",
                  transform: visible
                    ? `translateY(${rang * 13}px) scale(${1 - rang * 0.05}) rotate(${rang === 0 ? 0 : rang === 1 ? 1.6 : -1.8}deg)`
                    : "translateY(26px) scale(.9)",
                }}
              >
                <Image
                  src={r.src}
                  alt={r.alt}
                  width={900}
                  height={1125}
                  draggable={false}
                  quality={85}
                  sizes="(min-width: 640px) 400px, 100vw"
                  className="h-full w-full object-cover"
                />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => avancer(1)}
          aria-label="Photo suivante"
          className="hidden h-[54px] w-[54px] shrink-0 cursor-pointer rounded-full border-[3px] font-heading text-2xl transition active:scale-95 sm:block"
          style={{ color: encre, borderColor: bord }}
        >
          ›
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 sm:hidden">
        <button
          type="button"
          onClick={() => avancer(-1)}
          aria-label="Photo précédente"
          className="h-[54px] w-[54px] shrink-0 cursor-pointer rounded-full border-[3px] font-heading text-2xl transition active:scale-95"
          style={{ color: encre, borderColor: bord }}
        >
          ‹
        </button>
        <span className="font-heading text-base" style={{ color: encreDouce }}>
          {haut + 1} sur {n}
        </span>
        <button
          type="button"
          onClick={() => avancer(1)}
          aria-label="Photo suivante"
          className="h-[54px] w-[54px] shrink-0 cursor-pointer rounded-full border-[3px] font-heading text-2xl transition active:scale-95"
          style={{ color: encre, borderColor: bord }}
        >
          ›
        </button>
      </div>

      <p className="mt-4 hidden text-center font-heading text-base sm:block" style={{ color: encreDouce }}>
        {haut + 1} sur {n}
      </p>

      {/* Only what the customer actually wrote. A photo with no message shows
          no words rather than a flattering sentence nobody said. */}
      <p
        className="mx-auto mt-3 min-h-[72px] max-w-[660px] text-center text-base leading-snug font-medium sm:text-lg"
        style={{ color: encre }}
      >
        {courant.quote ? `« ${courant.quote} »` : ""}
      </p>
    </div>
  );
}
