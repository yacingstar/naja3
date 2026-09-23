"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { FeaturedProduct } from "@/lib/products";
import { useReveal } from "@/components/accueil/useReveal";
import { Affiche } from "@/components/serie/Affiche";
import { Entete } from "@/components/serie/Entete";
import { Pied } from "@/components/serie/Pied";
import { ENCRE, G, M, riso, ROUGE } from "@/components/serie/style";

// La boutique, dans le style « série » de l'accueil : même papier, même
// en-tête, les mêmes affiches de risographie — mais posées en planche, comme
// un catalogue d'imprimeur, au lieu de défiler à l'horizontale. Sur l'accueil
// on se promène dans la soirée ; ici on compare.
//
// Deux choses propres à la boutique :
//   - chaque affiche porte son numéro (№ 01…) et le nuancier de ses coloris ;
//   - sous la planche, un index façon fin de catalogue : forme, coloris, prix,
//     reliés par des pointillés, pour qui veut tout voir d'un coup d'œil.
//
// Mouvement, dans les règles de l'accueil : entrées en CSS, GSAP pour le
// défilement seulement, transformations seulement. Les affiches montent à
// l'arrivée (useReveal, position seule) et sur ordinateur la lampe dérive un
// peu moins vite que son affiche.

function numero(i: number) {
  return `№ ${String(i + 1).padStart(2, "0")}`;
}

export function Catalogue({ produits }: { produits: FeaturedProduct[] }) {
  const zone = useRef<HTMLDivElement>(null);
  useReveal(zone, "[data-apparait]");

  const coloris = produits.reduce((n, p) => n + p.colors.length, 0);
  const prixMin = produits.length ? Math.min(...produits.map((p) => p.price)) : 0;

  useEffect(() => {
    const ordinateur = window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
    if (!ordinateur || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let annule = false;
    const tweens: gsap.core.Tween[] = [];
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (annule || !zone.current) return;
      gsap.registerPlugin(ScrollTrigger);
      zone.current.querySelectorAll<HTMLElement>("[data-lampe]").forEach((el) => {
        tweens.push(
          gsap.to(el, {
            y: -18,
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

  return (
    <div ref={zone}>
      <Entete
        courant="boutique"
        droite={
          <span className="hidden opacity-80 sm:inline">
            {produits.length} formes · {coloris} coloris
          </span>
        }
      />

      {/* ── Titre ───────────────────────────────────────────────────── */}
      <div className="grid gap-5 px-5 pt-8 sm:px-10 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:pt-10">
        <h1 className={`${G} text-[44px] leading-[.95] font-bold tracking-[-.035em] sm:text-[64px] lg:text-[76px]`}>
          <span className="block overflow-hidden pb-[.05em]">
            <span className="naja-masque inline-block" style={{ animationDelay: ".05s" }}>
              Toute la série,
            </span>
          </span>
          <span className="block overflow-hidden pb-[.05em]">
            <span className="naja-masque inline-block" style={{ animationDelay: ".15s" }}>
              <span style={{ color: ROUGE }}>à la</span> commande.
            </span>
          </span>
        </h1>
        <div className="naja-monte max-w-[380px] lg:justify-self-end" style={{ animationDelay: ".3s" }}>
          <p className="text-[15px] leading-snug font-medium opacity-85">
            Chaque veilleuse est imprimée après votre commande, dans le coloris que vous choisissez.
            Vous payez au livreur.
          </p>
          <p className={`${M} mt-3 text-[11px] tracking-[.12em] uppercase`}>
            {produits.length} formes · {coloris} coloris · dès {prixMin.toLocaleString("fr-FR")} DA
          </p>
        </div>
      </div>

      {produits.length === 0 ? (
        <p className="px-5 pt-16 text-lg sm:px-10">
          Les premières veilleuses arrivent très bientôt — repassez par ici.
        </p>
      ) : (
        <>
          {/* ── La planche ──────────────────────────────────────────── */}
          <div className="mt-10 grid grid-cols-1 gap-x-7 gap-y-12 px-5 min-[480px]:grid-cols-2 sm:px-10 lg:mt-14 lg:grid-cols-3 xl:grid-cols-4">
            {produits.map((p, i) => (
              <Link
                key={p.id}
                href={`/boutique/${p.slug}`}
                data-apparait
                className="group block outline-none"
              >
                <Affiche
                  produit={p}
                  index={i}
                  repere={numero(i)}
                  pastilles
                  priority={i < 4}
                  sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 480px) 45vw, 90vw"
                />
                <span
                  className={`${M} mt-3 inline-flex items-center gap-2 text-[11px] tracking-[.12em] uppercase transition-all group-hover:gap-3.5`}
                >
                  Choisir le coloris <span aria-hidden>⟶</span>
                </span>
              </Link>
            ))}
          </div>

          {/* ── L'index ─────────────────────────────────────────────── */}
          <section className="px-5 pt-24 sm:px-10 lg:pt-32">
            <div
              data-apparait
              className="grid gap-4 border-t pt-5 lg:grid-cols-[220px_1fr]"
              style={{ borderColor: `${ENCRE}33` }}
            >
              <p className={`${M} text-[11px] tracking-[.14em] uppercase opacity-70`}>Index</p>
              <h2 className={`${G} text-[36px] leading-[.98] font-bold tracking-[-.03em] sm:text-[52px]`}>
                Tout, <span style={{ color: ROUGE }}>d&apos;un coup d&apos;œil</span>.
              </h2>
            </div>
            <ol className="mt-8 lg:ml-[236px]">
              {produits.map((p, i) => {
                const dispo = p.colors.filter((c) => c.inStock).length;
                return (
                  <li key={p.id} data-apparait>
                    <Link
                      href={`/boutique/${p.slug}`}
                      className="group flex items-baseline gap-3 border-b py-4 transition-colors"
                      style={{ borderColor: `${ENCRE}26` }}
                    >
                      <span className={`${M} w-12 shrink-0 text-[11px]`} style={{ color: ROUGE }}>
                        {numero(i)}
                      </span>
                      <span
                        aria-hidden
                        className="h-3 w-3 shrink-0 self-center rounded-full"
                        style={{ background: riso(i).fond }}
                      />
                      <span className={`${G} min-w-0 truncate text-[20px] font-semibold tracking-[-.01em] transition-transform group-hover:translate-x-1 sm:text-[24px]`}>
                        {p.name}
                      </span>
                      {/* Les pointillés de sommaire, qui relient le nom au prix. */}
                      <span aria-hidden className="mx-1 hidden flex-1 translate-y-[-4px] border-b border-dotted sm:block" style={{ borderColor: `${ENCRE}55` }} />
                      {/* Sur téléphone la ligne n'a pas la place pour le compte des
                          coloris : le nuancier de la planche le donne déjà. */}
                      <span className={`${M} hidden shrink-0 text-[11px] opacity-70 sm:inline`}>
                        {dispo === p.colors.length
                          ? `${p.colors.length} coloris`
                          : `${dispo}/${p.colors.length} coloris`}
                      </span>
                      <span className={`${M} ml-auto w-[76px] shrink-0 text-right text-[12px] sm:ml-0`}>
                        {p.price.toLocaleString("fr-FR")} DA
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
            <p className={`${M} mt-6 text-[11px] tracking-[.1em] uppercase opacity-70 lg:ml-[236px]`}>
              Paiement à la livraison · 58 wilayas · aucun acompte
            </p>
          </section>
        </>
      )}

      <Pied />
    </div>
  );
}
