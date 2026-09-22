"use client";

import { useEffect, useRef } from "react";

// An ambient wash behind the lower half of the page: four very large, very
// blurred blobs that drift. It exists to stop a long scroll feeling like a
// white document, not to be noticed.
//
// Deliberately calm. Anything that moves for a whole minute while somebody
// reads has to stay under the threshold where the eye starts tracking it:
// opacity around .25, a 120px blur so there is never an edge to follow,
// 26–40 second cycles, and travel measured in tens of pixels. The brief was
// "doux, qui ne picote pas les yeux", and the failure mode of a decorative
// background is that it competes with the words.
//
// It sits behind everything (`-z-10`) and is `aria-hidden`: it carries no
// information, so a screen reader must never meet it. It also stops entirely
// for anyone who has asked their device to reduce motion.
export function FondDoux({ teinte, nuit }: { teinte: string; nuit: boolean }) {
  const bloc = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let annule = false;
    const animations: gsap.core.Tween[] = [];

    import("gsap").then(({ gsap }) => {
      if (annule || !bloc.current) return;
      const blobs = bloc.current.querySelectorAll<HTMLElement>(".blob");
      blobs.forEach((b, i) => {
        // Each one has its own slow, unequal cycle so the four never line up
        // into a pulse — that is what would turn a wash into a flicker.
        animations.push(
          gsap.to(b, {
            x: i % 2 === 0 ? 70 : -60,
            y: i < 2 ? 50 : -45,
            scale: 1.12,
            duration: 26 + i * 5,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          }),
        );
      });
    });

    return () => {
      annule = true;
      animations.forEach((a) => a.kill());
    };
  }, []);

  // On the dark page the same blobs would be invisible; a warm amber wash
  // reads as lamplight spilling across the room instead.
  const couleurs = nuit
    ? ["rgba(255,196,110,.20)", "rgba(255,150,90,.14)", "rgba(167,155,224,.12)", "rgba(255,196,110,.10)"]
    : [`${teinte}`, "rgba(167,155,224,.18)", "rgba(168,195,160,.16)", "rgba(246,198,206,.20)"];

  return (
    <div ref={bloc} aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <span
        className="blob absolute -top-32 -left-24 h-[520px] w-[520px] rounded-full blur-[120px]"
        style={{ background: couleurs[0] }}
      />
      <span
        className="blob absolute top-[28%] -right-32 h-[460px] w-[460px] rounded-full blur-[120px]"
        style={{ background: couleurs[1] }}
      />
      <span
        className="blob absolute bottom-[22%] -left-32 h-[440px] w-[440px] rounded-full blur-[120px]"
        style={{ background: couleurs[2] }}
      />
      <span
        className="blob absolute -right-24 -bottom-32 h-[500px] w-[500px] rounded-full blur-[120px]"
        style={{ background: couleurs[3] }}
      />
    </div>
  );
}
