"use client";

import { useEffect, type RefObject } from "react";

// Le mouvement des pages « série », en un seul endroit.
//
// Chaque page marque ses éléments avec un attribut et ce crochet fait le
// reste : une seule lecture de GSAP, un seul nettoyage, et surtout une seule
// règle de sûreté à tenir au lieu d'une par composant.
//
// ── La règle ────────────────────────────────────────────────────────────────
// L'état de repos d'un élément est TOUJOURS son état final. GSAP ne fait que
// l'en écarter puis l'y ramener. Sur ce site, trois fois de suite, un `from`
// sur l'opacité ou sur une taille partant de zéro a laissé du contenu invisible
// en production quand l'animation ne partait pas. Donc :
//   - transformations seulement — jamais l'opacité, jamais `scale` depuis 0 ;
//   - les seuls éléments qui ont le droit de naître invisibles sont purement
//     décoratifs, et leur absence ne retire rien (la barre de progression) ;
//   - tout s'arrête sous `prefers-reduced-motion`.
// Au pire, un texte reste 40 px plus bas qu'il ne devrait : personne ne le voit.
//
// ── Les attributs ───────────────────────────────────────────────────────────
//   data-monte        monte en arrivant à l'écran (une fois)
//   data-monte-suite  pareil, mais en cascade entre frères et sœurs
//   data-titre        se lève depuis sous sa ligne (le parent masque le débord)
//   data-parallaxe    dérive plus lentement que la page
//   data-flotte       flotte en boucle
//   data-aimant       se penche vers le curseur (souris seulement)
//   data-incline      incline ses enfants vers le curseur (souris seulement)
//   data-compte       compte de 0 jusqu'au nombre écrit dedans
export function useMouvement(zone: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!zone.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let annule = false;
    const tweens: gsap.core.Tween[] = [];
    const detacher: Array<() => void> = [];

    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        if (annule || !zone.current) return;
        gsap.registerPlugin(ScrollTrigger);
        const z = zone.current;
        const souris = window.matchMedia("(pointer: fine)").matches;
        const q = <T extends HTMLElement>(s: string) => Array.from(z.querySelectorAll<T>(s));

        // ── Arrivées ────────────────────────────────────────────────
        q("[data-monte]").forEach((el) => {
          tweens.push(
            gsap.from(el, {
              y: 42,
              duration: 0.7,
              ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            }),
          );
        });

        // Les frères et sœurs d'un même parent arrivent l'un après l'autre.
        // Le déclencheur est le PARENT : sinon une carte déjà visible plus bas
        // rattraperait la première et la cascade ne se verrait pas.
        const groupes = new Set(q("[data-monte-suite]").map((el) => el.parentElement));
        groupes.forEach((parent) => {
          if (!parent) return;
          const enfants = Array.from(parent.querySelectorAll<HTMLElement>("[data-monte-suite]"));
          tweens.push(
            gsap.from(enfants, {
              y: 48,
              duration: 0.75,
              stagger: 0.08,
              ease: "power3.out",
              scrollTrigger: { trigger: parent, start: "top 85%", once: true },
            }),
          );
        });

        // Le titre se lève depuis sous sa propre ligne. Le masque est un
        // `overflow-hidden` posé par la page sur le parent ; au repos le texte
        // est simplement à sa place.
        q("[data-titre]").forEach((el) => {
          tweens.push(
            gsap.from(el, {
              yPercent: 108,
              duration: 0.9,
              ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 92%", once: true },
            }),
          );
        });

        // ── Défilement ──────────────────────────────────────────────
        q("[data-parallaxe]").forEach((el) => {
          const d = Number(el.dataset.parallaxe) || -20;
          tweens.push(
            gsap.to(el, {
              y: d,
              ease: "none",
              scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 },
            }),
          );
        });

        // ── Boucles ─────────────────────────────────────────────────
        q("[data-flotte]").forEach((el, i) => {
          tweens.push(
            gsap.to(el, {
              y: -9 - (i % 3) * 3,
              duration: 2.6 + (i % 4) * 0.4,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1,
              delay: (i % 5) * 0.2,
            }),
          );
        });

        // ── Curseur ─────────────────────────────────────────────────
        if (souris) {
          // Un bouton qui se déplace un peu vers le curseur quand on
          // l'approche : c'est ce qui donne l'impression que la page répond.
          q("[data-aimant]").forEach((el) => {
            const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
            const y = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
            const bouger = (e: PointerEvent) => {
              const r = el.getBoundingClientRect();
              x((e.clientX - (r.left + r.width / 2)) * 0.28);
              y((e.clientY - (r.top + r.height / 2)) * 0.34);
            };
            const partir = () => {
              x(0);
              y(0);
            };
            el.addEventListener("pointermove", bouger);
            el.addEventListener("pointerleave", partir);
            detacher.push(() => {
              el.removeEventListener("pointermove", bouger);
              el.removeEventListener("pointerleave", partir);
            });
          });

          q("[data-incline]").forEach((el) => {
            const rx = gsap.quickTo(el, "rotateX", { duration: 0.6, ease: "power3.out" });
            const ry = gsap.quickTo(el, "rotateY", { duration: 0.6, ease: "power3.out" });
            const force = Number(el.dataset.incline) || 7;
            const bouger = (e: PointerEvent) => {
              if (e.pointerType !== "mouse") return;
              const r = el.getBoundingClientRect();
              ry(((e.clientX - r.left) / r.width - 0.5) * force);
              rx(-((e.clientY - r.top) / r.height - 0.5) * force);
            };
            const partir = () => {
              rx(0);
              ry(0);
            };
            el.addEventListener("pointermove", bouger);
            el.addEventListener("pointerleave", partir);
            detacher.push(() => {
              el.removeEventListener("pointermove", bouger);
              el.removeEventListener("pointerleave", partir);
            });
          });
        }

        // ── Chiffres ────────────────────────────────────────────────
        // Le nombre final est déjà écrit dans le HTML : on ne fait que
        // remonter jusqu'à lui. Sans JS, il est simplement là.
        q("[data-compte]").forEach((el) => {
          const fin = Number(el.textContent?.replace(/\s/g, "") ?? 0);
          if (!Number.isFinite(fin) || fin === 0) return;
          const etat = { v: 0 };
          tweens.push(
            gsap.to(etat, {
              v: fin,
              duration: 1.1,
              ease: "power2.out",
              onUpdate: () => {
                el.textContent = String(Math.round(etat.v));
              },
              onComplete: () => {
                el.textContent = String(fin);
              },
              scrollTrigger: { trigger: el, start: "top 92%", once: true },
            }),
          );
        });
      },
    );

    return () => {
      annule = true;
      detacher.forEach((f) => f());
      tweens.forEach((t) => {
        t.scrollTrigger?.kill();
        t.kill();
      });
    };
  }, [zone]);
}
