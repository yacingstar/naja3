"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { FeaturedProduct } from "@/lib/products";
import { LampMark } from "@/components/LampMark";
import { FondDoux } from "@/components/accueil/FondDoux";
import { useReveal } from "@/components/accueil/useReveal";

// The shop in the same register as the homepage: thick encre outlines, flat
// colour blocks, the lamp swatch. The old page was a centred title over three
// soft cards; this one is meant to be scanned — shape, price, and how many
// coloris, in that order, because that is the order the question comes in.
//
// The blocks cycle through the same five fills as the steps and the footer, so
// the site keeps one palette rather than a new one per page.
const FONDS = ["#ffd166", "#8ad4c1", "#ff9ec7", "#b9a7f5", "#7fd4ee", "#ffb38a"];

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

  // La carte s'incline vers le curseur. Souris uniquement : sur un écran
  // tactile il n'y a pas de survol, et l'appui a déjà sa propre réponse.
  function pencher(e: React.PointerEvent<HTMLAnchorElement>) {
    if (e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    import("gsap").then(({ gsap }) =>
      gsap.to(el, { rotateY: x * 7, rotateX: -y * 7, duration: 0.4, ease: "power2.out", overwrite: "auto" }),
    );
  }

  function redresser(e: React.PointerEvent<HTMLAnchorElement>) {
    const el = e.currentTarget;
    import("gsap").then(({ gsap }) =>
      gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.5, ease: "power2.out", overwrite: "auto" }),
    );
  }

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
        {produits.map((p, i) => {
          const dispo = p.colors.filter((c) => c.inStock);
          const montres = p.colors.slice(0, 6);
          const reste = p.colors.length - montres.length;
          return (
            <Link
              key={p.id}
              href={`/boutique/${p.slug}`}
              data-apparait
              onPointerMove={pencher}
              onPointerLeave={redresser}
              className="group block rounded-[2.25rem] border-4 border-encre p-5 transition-shadow duration-300 [transform-style:preserve-3d] hover:shadow-[0_24px_44px_-22px_rgba(36,28,33,.5)] sm:p-6"
              style={{ background: FONDS[i % FONDS.length], perspective: 900 }}
            >
              <span className="flex h-[230px] items-center justify-center sm:h-[260px]">
                {p.photoUrl ? (
                  <Image
                    src={p.photoUrl}
                    alt={`Veilleuse ${p.name}`}
                    width={420}
                    height={420}
                    quality={85}
                    sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
                    className="carte-photo h-full w-auto object-contain transition duration-300 group-hover:scale-105"
                  />
                ) : null}
              </span>

              <span className="mt-3 flex items-baseline justify-between gap-3">
                <span className="font-heading text-[30px] leading-none font-bold text-encre sm:text-[34px]">
                  {p.name.toLowerCase()}
                </span>
                <span className="shrink-0 font-heading text-xl text-encre sm:text-[22px]">
                  {p.price.toLocaleString("fr-FR")} DA
                </span>
              </span>

              {p.description ? (
                <span className="mt-1.5 line-clamp-2 text-[15px] leading-snug font-medium text-encre/75">
                  {p.description}
                </span>
              ) : null}

              {/* The coloris, drawn as the lamps they are — the same mark as the
                  configurator, the product page and the admin. Six is where a
                  row stops reading as a range and starts reading as clutter. */}
              <span className="mt-3 flex flex-wrap items-center gap-1.5">
                {montres.map((c) => (
                  <span
                    key={c.id}
                    title={c.inStock ? c.colorName : `${c.colorName} (rupture)`}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-encre/20 bg-papier ${
                      c.inStock ? "" : "opacity-40"
                    }`}
                  >
                    <LampMark hex={c.colorHex} hex2={c.colorHex2} className="h-6 w-6" />
                  </span>
                ))}
                {reste > 0 ? (
                  <span className="ml-0.5 font-heading text-sm text-encre/70">+{reste}</span>
                ) : null}
              </span>

              <span className="mt-3 block text-[13px] font-semibold tracking-[.06em] text-encre/60 uppercase">
                {dispo.length === p.colors.length
                  ? `${p.colors.length} coloris`
                  : `${dispo.length} sur ${p.colors.length} coloris disponibles`}
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
