"use client";

import { useEffect, useRef } from "react";
import type { FeaturedProduct } from "@/lib/products";
import { CarteProduit } from "@/components/boutique/CarteProduit";
import { FondDoux } from "@/components/accueil/FondDoux";
import { useReveal } from "@/components/accueil/useReveal";

// The shop in the same register as the homepage: thick encre outlines, flat
// colour blocks, the lamp swatch. The old page was a centred title over three
// soft cards; this one is meant to be scanned — shape, price, and how many
// coloris, in that order, because that is the order the question comes in.
//
// The card itself lives in CarteProduit: the product page's "Vous aimerez
// aussi" row needs exactly the same one, and two copies would drift.
export function BoutiqueClient({ produits }: { produits: FeaturedProduct[] }) {
  const zone = useRef<HTMLDivElement>(null);
  const titre = useRef<HTMLHeadingElement>(null);
  useReveal(zone, "[data-apparait]");

  // Deux mouvements liés au défilement, et un au curseur. Tous ne touchent que
  // des transformations : jamais l'opacité, jamais la taille depuis zéro. Une
  // animation interrompue laisse au pire un élément légèrement décalé, ce qui
  // ne se remarque pas — contrairement à un contenu resté invisible.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let annule = false;
    const tweens: gsap.core.Tween[] = [];

    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (annule || !zone.current) return;
      gsap.registerPlugin(ScrollTrigger);

      // Le titre se lève mot par mot.
      if (titre.current) {
        tweens.push(
          gsap.from(titre.current.querySelectorAll("span"), {
            y: 36,
            duration: 0.6,
            stagger: 0.07,
            ease: "power3.out",
          }),
        );
      }

      // Parallaxe : la veilleuse dérive un peu plus lentement que sa carte, ce
      // qui donne de la profondeur sans que rien ne bouge visiblement tout seul.
      zone.current.querySelectorAll<HTMLElement>(".carte-photo").forEach((el) => {
        tweens.push(
          gsap.to(el, {
            y: -24,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 },
          }),
        );
      });
    });

    return () => {
      annule = true;
      tweens.forEach((t) => {
        t.scrollTrigger?.kill();
        t.kill();
      });
    };
  }, []);

  if (produits.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-24 text-center sm:px-12">
        <h1 className="font-heading text-[42px] leading-none font-bold tracking-[-.02em] sm:text-[56px]">
          La boutique.
        </h1>
        <p className="mt-4 text-lg font-medium text-encre/70">
          Les premières veilleuses arrivent très bientôt — repassez par ici.
        </p>
      </main>
    );
  }

  const coloris = produits.reduce((n, p) => n + p.colors.length, 0);

  return (
    <main ref={zone} className="relative px-5 pt-10 pb-16 sm:px-12 sm:pt-14">
      <FondDoux teinte="rgba(246,198,206,.22)" nuit={false} />

      <div data-apparait>
        <span className="inline-block rounded-full bg-encre px-4 py-2 font-heading text-[13px] text-papier sm:text-[15px]">
          {produits.length} formes · {coloris} coloris
        </span>
        <h1
          ref={titre}
          className="mt-3 font-heading text-[48px] leading-[.9] font-bold tracking-[-.03em] sm:text-[72px]"
        >
          {["Toutes", "les", "veilleuses."].map((mot) => (
            <span key={mot} className="mr-[.22em] inline-block">
              {mot}
            </span>
          ))}
        </h1>
        <p className="mt-3 max-w-[640px] text-base font-medium text-encre/72 sm:text-lg">
          Chacune est imprimée après votre commande, dans le coloris que vous choisissez. Vous payez au livreur.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {produits.map((p, i) => (
          <CarteProduit key={p.id} produit={p} index={i} />
        ))}
      </div>
    </main>
  );
}
