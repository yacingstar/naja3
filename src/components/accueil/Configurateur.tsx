"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { FeaturedProduct } from "@/lib/products";
import { LampMark } from "@/components/LampMark";
import { inkOn } from "@/lib/accueil";

// The hero IS the choice: shape, then coloris, then the price and the button.
// The old hero showed a lamp and sent you elsewhere to pick one; this one lets
// the visitor do on the homepage exactly what they will do to order.
//
// Only the SELECTED photograph is rendered. The mock-up kept all forty-one in
// the page because its runtime could not swap a src; here it can, and that
// matters: forty-one requests per visit is what put the shop's Supabase over
// its egress quota in September.
//
// ── L'ordre sur téléphone ────────────────────────────────────────────────────
// En empilant simplement la colonne de gauche puis la photo, le premier écran
// d'un téléphone montrait : deux pastilles, un titre, SEPT boutons de forme sur
// quatre rangées, QUINZE pastilles de couleur sur trois rangées, un bouton — et
// la veilleuse commençait sous la ligne de flottaison. On ouvrait une boutique
// de lampes et on voyait un formulaire.
//
// La grille place donc la photo entre le titre et les choix sur un écran
// étroit, et la remet à droite dès `lg`. Les deux listes défilent
// horizontalement sur une seule ligne au lieu d'envelopper : sept rangées
// gagnées, et le geste (faire glisser du pouce) est celui qu'on fait déjà.
// Des petites veilleuses qui flottent au fond de l'en-tête. Le fond du héros
// doit rester assez pâle pour que le texte reste lisible dessus, donc la
// couleur ne peut pas venir de lui ; elle vient de ces marques-là, posées près
// des bords et à faible opacité, là où il n'y a ni titre ni bouton.
const DECOR = [
  { l: "86%", t: "5%", taille: "h-9 w-9", hex: "#ff5d8f", o: 0.38 },
  { l: "3%", t: "44%", taille: "h-7 w-7", hex: "#ffc233", o: 0.34 },
  { l: "89%", t: "38%", taille: "h-12 w-12", hex: "#7fd4ee", o: 0.32 },
  { l: "7%", t: "80%", taille: "h-8 w-8", hex: "#8ad4c1", o: 0.3 },
  { l: "80%", t: "86%", taille: "h-9 w-9", hex: "#b9a7f5", o: 0.3 },
];

export function Configurateur({
  produits,
  p,
  c,
  nuit,
  onForme,
  onCouleur,
  onNuit,
  fond,
  encre,
  encreDouce,
  bord,
}: {
  produits: FeaturedProduct[];
  p: number;
  c: number;
  nuit: boolean;
  onForme: (i: number) => void;
  onCouleur: (i: number) => void;
  onNuit: () => void;
  fond: string;
  encre: string;
  encreDouce: string;
  bord: string;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const lampe = useRef<HTMLDivElement>(null);
  const anneau = useRef<HTMLSpanElement>(null);
  const decor = useRef<HTMLDivElement>(null);

  const produit = produits[p];
  const coloris = produit?.colors[c] ?? produit?.colors[0];
  const photo = coloris?.photoUrl ?? produit?.photoUrl ?? null;
  const teinte = coloris?.colorHex ?? "#e5d9cf";

  // Deux mouvements permanents, sur deux éléments imbriqués pour qu'ils ne se
  // disputent pas la même propriété : la scène dérive au défilement, la lampe
  // flotte à l'intérieur. Transformations seulement, et rien qui parte de
  // l'invisible — si GSAP ne se charge pas, la lampe est simplement immobile.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let annule = false;
    const tweens: gsap.core.Tween[] = [];

    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        if (annule) return;
        gsap.registerPlugin(ScrollTrigger);

        if (lampe.current) {
          tweens.push(
            gsap.to(lampe.current, {
              y: -14,
              duration: 2.8,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1,
            }),
          );
        }

        // Chaque petite veilleuse dérive à son propre rythme, sinon les cinq
        // se synchronisent et le fond se met à battre au lieu de respirer.
        decor.current?.querySelectorAll<HTMLElement>("span").forEach((el, i) => {
          tweens.push(
            gsap.to(el, {
              y: i % 2 === 0 ? -22 : 18,
              rotate: i % 2 === 0 ? 10 : -12,
              duration: 6 + i * 1.4,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1,
            }),
          );
        });

        if (scene.current) {
          tweens.push(
            gsap.to(scene.current, {
              y: 60,
              ease: "none",
              scrollTrigger: {
                trigger: scene.current,
                start: "top top",
                end: "bottom top",
                scrub: 0.5,
              },
            }),
          );
        }
      },
    );

    return () => {
      annule = true;
      tweens.forEach((t) => {
        t.scrollTrigger?.kill();
        t.kill();
      });
    };
  }, []);

  // Une onde part de la lampe à chaque changement de coloris. Son état de repos
  // est invisible, donc elle ne peut pas rester coincée à l'écran : si
  // l'animation ne démarre jamais, il ne se passe simplement rien.
  useEffect(() => {
    if (!anneau.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let annule = false;
    import("gsap").then(({ gsap }) => {
      if (annule || !anneau.current) return;
      gsap.fromTo(
        anneau.current,
        { scale: 0.55, opacity: 0.5 },
        { scale: 1.45, opacity: 0, duration: 0.85, ease: "power2.out" },
      );
    });
    return () => {
      annule = true;
    };
  }, [coloris?.id]);

  // Retour au doigt : le bouton touché rebondit. Purement décoratif et sans
  // état — l'élément revient à sa taille normale, qui est aussi celle qu'il a
  // si rien ne s'exécute.
  function rebond(el: HTMLElement) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    import("gsap").then(({ gsap }) =>
      gsap.fromTo(
        el,
        { scale: 0.84 },
        { scale: 1, duration: 0.5, ease: "elastic.out(1, .5)", overwrite: "auto" },
      ),
    );
  }

  if (!produit || !coloris) return null;

  return (
    <div
      id="composer"
      className="relative overflow-hidden rounded-b-[3.5rem] transition-colors duration-700"
      style={{ background: fond }}
    >
      <div ref={decor} aria-hidden className="pointer-events-none absolute inset-0 z-0">
        {DECOR.map((d) => (
          <span key={d.hex} className="absolute" style={{ left: d.l, top: d.t, opacity: d.o }}>
            <LampMark hex={d.hex} hex2={null} className={d.taille} />
          </span>
        ))}
      </div>

      <div className="relative z-10 grid gap-3 px-5 pb-8 sm:px-12 lg:gap-4 lg:grid-cols-[500px_1fr] lg:grid-rows-[auto_1fr] lg:items-center lg:gap-x-6 lg:pb-12">
        {/* ── Qui vous regardez ─────────────────────────────────────── */}
        <div className="min-w-0 lg:col-start-1 lg:row-start-1 lg:self-end">
          <div className="flex flex-wrap items-center gap-3">
            <span className="naja-monte inline-block rounded-full bg-encre px-4 py-2 font-heading text-[13px] text-papier sm:text-[15px]">
              {produits.length} formes · {produits.reduce((n, x) => n + x.colors.length, 0)} coloris
            </span>
            <button
              type="button"
              onClick={onNuit}
              className="cursor-pointer rounded-full border-[3px] px-4 py-2 font-heading text-[13px] transition active:scale-95 sm:text-[15px]"
              style={{ color: encre, borderColor: bord }}
            >
              {nuit ? "☀ Le jour" : "☾ Voir la nuit"}
            </button>
          </div>
          {/* Keyé sur la forme : changer de veilleuse rejoue la montée du nom,
              donc le titre accompagne le changement au lieu de se substituer. */}
          <h1
            key={produit.id}
            className="naja-monte mt-3 font-heading text-[60px] leading-[.86] font-bold tracking-[-.03em] sm:text-[76px]"
            style={{ color: encre, animationDelay: ".08s" }}
          >
            {produit.name.toLowerCase()}
          </h1>
          <p
            className="naja-monte mt-1.5 font-heading text-[27px] font-semibold sm:text-3xl"
            style={{ color: encre, animationDelay: ".16s" }}
          >
            en{" "}
            <span
              key={`${p}-${c}`}
              className="naja-pop inline-block rounded-2xl border-2 px-3 py-0.5"
              style={{
                background: teinte,
                // L'encre suit la teinte : noire sur un jaune, crème sur un
                // bleu nuit. Aucun coloris ne peut devenir illisible.
                color: inkOn(teinte),
                borderColor: nuit ? "rgba(255,253,247,.35)" : "rgba(36,28,33,.22)",
              }}
            >
              {coloris.colorName.toLowerCase()}
            </span>
            .
          </p>
        </div>

        {/* ── La veilleuse ──────────────────────────────────────────── */}
        <div
          ref={scene}
          className="relative flex h-[286px] min-w-0 items-center justify-center lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-[520px]"
        >
          {/* La teinte choisie déborde derrière la lampe. C'est ce qui met de
              la couleur dans l'écran sans toucher au fond, qui doit rester
              assez pâle pour que le texte reste lisible. */}
          <span
            aria-hidden
            className="absolute h-[250px] w-[250px] rounded-full opacity-45 blur-[70px] transition-colors duration-700 lg:h-[420px] lg:w-[420px]"
            style={{ background: teinte }}
          />
          {/* L'onde de changement de coloris. Invisible au repos. */}
          <span
            ref={anneau}
            aria-hidden
            className="pointer-events-none absolute h-[270px] w-[270px] rounded-full border-[3px] opacity-0 lg:h-[430px] lg:w-[430px]"
            style={{ borderColor: teinte }}
          />
          <div
            aria-hidden
            className="absolute h-[290px] w-[290px] rounded-full transition-opacity duration-700 lg:h-[520px] lg:w-[520px]"
            style={{
              opacity: nuit ? 1 : 0,
              background:
                "radial-gradient(circle, rgba(255,196,110,.6) 0%, rgba(255,196,110,.2) 45%, rgba(23,19,26,0) 70%)",
            }}
          />
          <div ref={lampe} className="relative">
            {photo ? (
              <Image
                key={photo}
                src={photo}
                alt={`Veilleuse ${produit.name}, coloris ${coloris.colorName}`}
                width={520}
                height={520}
                priority
                quality={85}
                sizes="(min-width: 1024px) 470px, 280px"
                className="naja-photo h-[276px] w-[276px] object-contain lg:h-[470px] lg:w-[470px]"
              />
            ) : (
              <p className="text-sm" style={{ color: encreDouce }}>
                Photo à venir pour ce coloris.
              </p>
            )}
          </div>
        </div>

        {/* ── Ce que vous choisissez ────────────────────────────────── */}
        <div className="min-w-0 lg:col-start-1 lg:row-start-2 lg:self-start">
          <p
            className="text-[13px] font-semibold tracking-[.1em] uppercase"
            style={{ color: encreDouce }}
          >
            1 · la forme
          </p>
          {/* Une seule ligne qui glisse sous le pouce. Les marges négatives
              rendent la bande pleine largeur pour que la dernière forme ne
              semble pas coupée par un bord de page. */}
          <div className="scrollbar-hidden -mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-12 sm:px-12 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
            {produits.map((x, i) => (
              <button
                key={x.id}
                type="button"
                onClick={(e) => {
                  onForme(i);
                  rebond(e.currentTarget);
                }}
                aria-pressed={i === p}
                className="naja-monte shrink-0 cursor-pointer rounded-full border-[3px] px-4 py-2.5 font-heading text-base transition active:translate-y-1"
                // De nuit, la sélection s'inverse : un bouton encre sur un
                // fond encre ne se voit pas. C'est la forme choisie, elle doit
                // être la plus lisible des sept.
                style={{
                  animationDelay: `${0.24 + i * 0.035}s`,
                  ...(i === p
                    ? nuit
                      ? { background: "#fffdf7", color: "#241c21", borderColor: "#fffdf7" }
                      : { background: "#241c21", color: "#fffdf7", borderColor: "#241c21" }
                    : { background: "transparent", color: encre, borderColor: bord }),
                }}
              >
                {x.name}
              </button>
            ))}
          </div>

          <p
            className="mt-4 text-[13px] font-semibold tracking-[.1em] uppercase"
            style={{ color: encreDouce }}
          >
            2 · la couleur — {produit.colors.length} coloris
          </p>
          <div
            key={p}
            className="scrollbar-hidden -mx-5 mt-2 flex gap-2.5 overflow-x-auto px-5 pb-1 sm:-mx-12 sm:px-12 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0"
          >
            {produit.colors.map((col, i) => (
              <button
                key={col.id}
                type="button"
                onClick={(e) => {
                  onCouleur(i);
                  rebond(e.currentTarget);
                }}
                disabled={!col.inStock}
                aria-label={col.inStock ? col.colorName : `${col.colorName} (rupture)`}
                title={col.inStock ? col.colorName : `${col.colorName} (rupture)`}
                aria-pressed={i === c}
                // The same lamp the admin and the product pages draw. A flat
                // disc here would have been the only place on the site where a
                // bicolour variant loses its second hue, and the shape is what
                // says WHERE each hue goes: shade above, base below.
                //
                // 52px: this is a thumb on a phone, not a mouse.
                className={`naja-pop relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-papier ${
                  col.inStock ? "cursor-pointer" : "cursor-not-allowed opacity-40"
                }`}
                style={{
                  animationDelay: `${0.3 + i * 0.022}s`,
                  border:
                    i === c
                      ? `4px solid ${nuit ? "#fffdf7" : "#241c21"}`
                      : `3px solid ${bord}`,
                }}
              >
                <LampMark hex={col.colorHex} hex2={col.colorHex2} className="h-9 w-9" />

                {/* Out of stock reads as a struck-through mark, so it is not
                    carried by the faded opacity alone. */}
                {!col.inStock ? (
                  <span
                    aria-hidden
                    className="absolute inset-0 m-auto h-[1.5px] w-9 rotate-45 rounded-full bg-encre/70"
                  />
                ) : null}
              </button>
            ))}
          </div>

          <a
            href={`/boutique/${produit.slug}#c${coloris.id}`}
            className="mt-5 flex items-center justify-between rounded-full bg-encre px-6 py-4 font-heading text-lg text-papier shadow-[0_7px_0_-1px_rgba(36,28,33,.35)] transition active:translate-y-1 active:shadow-none sm:text-xl"
          >
            <span>Je la veux comme ça</span>
            <span>{produit.price.toLocaleString("fr-FR")} DA</span>
          </a>
        </div>
      </div>
    </div>
  );
}
