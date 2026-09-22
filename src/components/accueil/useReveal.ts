"use client";

import { useEffect, type RefObject } from "react";

/**
 * Slides the children of `zone` up as they scroll into view.
 *
 * It animates POSITION ONLY, never opacity, and that restraint is deliberate.
 * A scroll reveal that fades in from `opacity: 0` leaves the whole lower half
 * of the page blank if ScrollTrigger never initialises — a slow connection, a
 * blocked chunk, a browser that throttles the tab. This page has already shown
 * that failure three times with plain GSAP entrances. Here the worst case is
 * content sitting 40px lower than it should, which nobody will ever notice.
 *
 * Stops entirely under `prefers-reduced-motion`.
 */
export function useReveal(zone: RefObject<HTMLElement | null>, selecteur: string) {
  useEffect(() => {
    if (!zone.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let annule = false;
    let declencheurs: ScrollTrigger[] = [];

    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (annule || !zone.current) return;
      gsap.registerPlugin(ScrollTrigger);

      const cibles = zone.current.querySelectorAll<HTMLElement>(selecteur);
      cibles.forEach((el) => {
        const tween = gsap.from(el, {
          y: 40,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            // Starts when the element is a fifth of the way up the viewport:
            // early enough that the movement is over before it is read.
            start: "top 85%",
            once: true,
          },
        });
        const st = tween.scrollTrigger;
        if (st) declencheurs.push(st);
      });
    });

    return () => {
      annule = true;
      declencheurs.forEach((d) => d.kill());
      declencheurs = [];
    };
  }, [zone, selecteur]);
}
