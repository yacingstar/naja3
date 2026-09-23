"use client";

import { useEffect, useRef } from "react";
import { ROUGE } from "@/components/serie/style";

// Un filet rouge en haut de l'écran, qui se remplit au fil de la page.
//
// C'est le seul élément du site qui a le droit de naître invisible : il est
// purement décoratif et ne porte aucune information qu'on ne lise ailleurs.
// Sans JavaScript, il reste à zéro — c'est-à-dire absent — et rien ne manque.
//
// `scaleX` et non `width` : une transformation ne relance pas la mise en page,
// donc le filet peut suivre le défilement à chaque image sans rien coûter.
export function Progression() {
  const filet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let annule = false;
    let tween: gsap.core.Tween | null = null;

    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        if (annule || !filet.current) return;
        gsap.registerPlugin(ScrollTrigger);
        tween = gsap.to(filet.current, {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
        });
      },
    );

    return () => {
      annule = true;
      tween?.scrollTrigger?.kill();
      tween?.kill();
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] origin-left scale-x-0"
      ref={filet}
      style={{ background: ROUGE }}
    />
  );
}
