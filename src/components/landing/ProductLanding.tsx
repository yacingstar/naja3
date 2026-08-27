"use client";

import Image from "next/image";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { CraftSteps } from "@/components/site/CraftSteps";
import { DirectOrderForm } from "@/components/site/DirectOrderForm";
import { Faq } from "@/components/site/Faq";
import { Reveal } from "@/components/site/Reveal";
import { TrustStrip } from "@/components/site/TrustStrip";
import { trackViewContent } from "@/lib/analytics";
import type { DeliveryRate } from "@/lib/deliveryRates";
import { formatPrice } from "@/lib/format";
import type { ProductColorDetail } from "@/lib/products";

export type LandingProduct = {
  id: number;
  slug: string;
  name: string;
  price: number;
  /** Position in the catalogue, 1-based — the hero's "lampe nº 3". */
  number: number;
  /** Hero paragraph and "chez vous" card, split from the one admin
      description by lib/productCopy.ts. */
  lead: string;
  roomCopy: string;
};

// The long-form page an Instagram ad lands on: one lamp, told at length, with
// the order form at the end.
//
// It used to run on its own design system — a Modernist poster (Archivo 800,
// one hard red, zero radius, 2px rules) ported from the Claude Design mockup
// the client first pointed at. That whole stylesheet is gone. Two design
// systems in one app was never going to feel like one shop, and the poster
// also meant a second copy of the craft steps, the trust line and the FAQ,
// free to drift from the homepage's.
//
// So the middle of this page is now literally the homepage's own sections —
// TrustStrip, CraftSteps, Faq — and the order form is literally the shop's
// DirectOrderForm. What stays bespoke is the only part that makes sense
// nowhere else: a hero that puts one lamp on a dark stage and lets you switch
// it on.
//
// It also lives under the (site) route group now, so it gets the real header
// and footer instead of drawing its own.

const PROMISES = [
  {
    kicker: "aucune série",
    title: "La vôtre n'existe pas encore",
    body: "Elle est imprimée après votre commande, pièce par pièce. Rien ne dort dans un carton en attendant un acheteur.",
    tint: "bg-blush/35",
  },
  {
    kicker: "petit grain",
    title: "Un caractère à elle",
    body: "Les couches se voient un peu, et c'est voulu. Deux lampes ne sont jamais tout à fait identiques.",
    tint: "bg-sauge/35",
  },
  {
    kicker: "zéro risque",
    title: "Vous payez en la recevant",
    body: "En espèces, à domicile ou en stopdesk. Aucune carte, aucun paiement en ligne, dans les 58 wilayas.",
    tint: "bg-lueur/30",
  },
];

export function ProductLanding({
  product,
  colors,
  rates,
}: {
  product: LandingProduct;
  colors: ProductColorDetail[];
  rates: DeliveryRate[];
}) {
  // Colours arrive in-stock-first from getProductBySlug, so the default is
  // always something someone can actually buy.
  const [selectedColorId, setSelectedColorId] = useState(colors[0]?.id);
  const [lit, setLit] = useState(true);

  const color = colors.find((c) => c.id === selectedColorId) ?? colors[0];

  // The in-situ shot follows the selected colour, but a colour that only has a
  // cutout would blank the whole "chez vous" band. Falling back to any other
  // colour's room photo keeps the section intact — it is there to show the
  // lamp's scale in a room, and every colour is the same shape.
  const roomPhoto = useMemo(
    () =>
      color?.photos[0]?.url ??
      colors.find((candidate) => candidate.photos.length > 0)?.photos[0]?.url ??
      null,
    [color, colors],
  );

  useEffect(() => {
    trackViewContent({ id: product.slug, name: product.name, value: product.price });
  }, [product.slug, product.name, product.price]);

  return (
    <main className="pb-24">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 pt-10 pb-16 lg:grid-cols-2 lg:gap-16 lg:pt-16">
        <div>
          <p className="font-hand text-xl text-crepuscule">
            lampe nº {product.number}, faite main
          </p>
          <h1 className="mt-1 font-heading text-4xl leading-[1.05] font-bold sm:text-5xl lg:text-6xl">
            {product.name} <span className="text-lueur">qui s&apos;allume</span>
          </h1>

          <p className="mt-5 max-w-prose leading-relaxed text-encre/75">
            {product.lead}
          </p>

          <div className="mt-7 flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <p className="font-heading text-3xl">{formatPrice(product.price)}</p>
            <p className="text-sm text-encre/60">Paiement en espèces, à la livraison</p>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            {/* An anchor, not a button: the form at the foot of the page is the
                one place an order is placed. */}
            <a
              href="#commander"
              className="rounded-full bg-lueur px-8 py-3.5 font-heading text-sm text-encre shadow-[0_10px_30px_-12px_var(--lueur)] transition hover:bg-lueur/90"
            >
              Commander
            </a>
            <button
              type="button"
              onClick={() => setLit((on) => !on)}
              className="rounded-full border border-encre/25 px-7 py-3.5 font-heading text-sm transition hover:border-encre"
            >
              {lit ? "Éteindre" : "Allumer la lampe"}
            </button>
          </div>
        </div>

        <div>
          {/* The one thing that stays bespoke to this page. A lamp switching on
              only reads as light if there is dark for it to push against, so
              the stage — and only the stage — goes to night. */}
          <div
            className="lamp-stage mx-auto aspect-square w-full max-w-lg"
            data-lit={lit ? "on" : "off"}
          >
            <div
              className="lamp-stage-glow"
              aria-hidden
              style={
                color?.colorHex
                  ? ({ "--lamp-color": color.colorHex } as CSSProperties)
                  : undefined
              }
            />
            {color?.cutoutPhotoUrl ? (
              <Image
                // Keyed by URL so switching colour genuinely swaps the element
                // instead of repainting one node's src — see ProductStage.tsx
                // for what that looked like.
                key={color.cutoutPhotoUrl}
                src={color.cutoutPhotoUrl}
                alt={`${product.name} — ${color.colorName}`}
                fill
                // The LCP element on a page people arrive at cold from an ad;
                // it must not wait for the lazy pass.
                priority
                sizes="(min-width: 1024px) 512px, 90vw"
                quality={85}
                className="object-contain p-8"
              />
            ) : (
              <p className="absolute inset-0 flex items-center justify-center font-hand text-lg text-encre/40">
                photo à venir
              </p>
            )}
          </div>

          {/* Picking here previews the colour on the stage. The order form has
              its own picker driving the same state — you choose one to look at,
              then confirm it at the point of ordering. */}
          {colors.length > 1 ? (
            <div
              role="radiogroup"
              aria-label="Couleur"
              className="mx-auto mt-5 flex max-w-lg flex-wrap justify-center gap-2"
            >
              {colors.map((option) => {
                const selected = option.id === color?.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={!option.inStock}
                    onClick={() => setSelectedColorId(option.id)}
                    className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition ${
                      selected ? "border-encre bg-papier shadow-sm" : "border-encre/15"
                    } ${
                      option.inStock
                        ? "hover:border-encre"
                        : "cursor-not-allowed opacity-45"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="h-3.5 w-3.5 rounded-full border border-encre/20"
                      style={{ backgroundColor: option.colorHex ?? "#e5d9cf" }}
                    />
                    {option.colorName}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      <TrustStrip />

      {/* ── Why this one ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PROMISES.map((promise, index) => (
            <Reveal key={promise.kicker} delay={index * 80}>
              <div className={`h-full rounded-[2rem] p-7 ${promise.tint}`}>
                <p className="font-hand text-xl text-encre/70">{promise.kicker}</p>
                <h2 className="mt-1 font-heading text-xl leading-snug">
                  {promise.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-encre/75">
                  {promise.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* The homepage's own section, illustrations and all — not a retelling of
          it. Edit the steps once and both pages change. */}
      <div className="mx-auto max-w-6xl px-6">
        <CraftSteps />
      </div>

      {/* ── The lamp somewhere real ──────────────────────────────────── */}
      {roomPhoto ? (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-14">
            <Reveal>
              {/* Matted, not cropped. These photographs come out of the admin
                  anywhere from 0.75 to 1.25 aspect, so any fixed crop box cuts
                  something off somebody's picture — which is exactly what the
                  full-bleed band this replaced did. `contain` on a tinted panel
                  shows all of every one, the same treatment ProductStage gives
                  a cutout. */}
              <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-blush/25">
                <Image
                  key={roomPhoto}
                  src={roomPhoto}
                  alt={`${product.name} posée chez soi`}
                  fill
                  sizes="(min-width: 768px) 512px, 90vw"
                  quality={85}
                  className="object-contain p-3"
                />
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div>
                <p className="font-hand text-xl text-crepuscule">chez vous</p>
                <h2 className="mt-1 font-heading text-3xl leading-snug sm:text-4xl">
                  Une lumière chaude, posée là où vous vivez.
                </h2>
                <p className="mt-4 max-w-prose leading-relaxed text-encre/75">
                  {product.roomCopy}
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      ) : null}

      <Faq />

      {/* ── Order ────────────────────────────────────────────────────── */}
      <section id="commander" className="mx-auto max-w-2xl scroll-mt-24 px-6 pt-8">
        <Reveal>
          <p className="text-center font-hand text-2xl text-crepuscule">on y est</p>
          <h2 className="mt-1 text-center font-heading text-3xl sm:text-4xl">
            Allumez-la ce soir.
          </h2>
        </Reveal>

        <DirectOrderForm
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            price: product.price,
          }}
          colors={colors}
          selectedColorId={color?.id}
          onSelectColor={setSelectedColorId}
          rates={rates}
        />
      </section>
    </main>
  );
}
