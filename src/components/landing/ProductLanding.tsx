"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  LandingFabrication,
  LandingFaq,
  LandingFooter,
  LandingPromises,
  LandingTicker,
} from "@/components/landing/LandingSections";
import { trackAddToCart, trackViewContent } from "@/lib/analytics";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { ProductColorDetail } from "@/lib/products";

export type LandingProduct = {
  id: number;
  slug: string;
  name: string;
  price: number;
  /** Position in the catalogue, 1-based — the hero's "Lampe nº 3". */
  number: number;
  /** Hero paragraph and "Chez vous" card, split from the one admin
      description by lib/productCopy.ts. */
  lead: string;
  roomCopy: string;
};

// One client component owning the whole page, the same call ProductDetail.tsx
// makes and for the same reason: two pieces of state (which colour, lamp on
// or off) reach into almost every section — the hero photo, the nuancier, the
// in-situ photograph, the state badge, and what both add-to-cart buttons put
// in the cart. Threading that through a context so the four static bands
// could stay server components would buy a few KB of JS and cost a lot of
// indirection; the static bands live in LandingSections.tsx instead, which
// gets the file-length win without the plumbing.
export function ProductLanding({
  product,
  colors,
}: {
  product: LandingProduct;
  colors: ProductColorDetail[];
}) {
  const { addItem, totalQuantity } = useCart();
  // Colours arrive in-stock-first from getProductBySlug, so index 0 is always
  // something someone can actually buy — unless nothing is in stock at all.
  const [index, setIndex] = useState(0);
  const [lit, setLit] = useState(true);
  const [justAdded, setJustAdded] = useState(false);

  const color = colors[index];
  const inStock = Boolean(color?.inStock);
  const price = formatPrice(product.price);

  // The in-situ shot follows the selected colour, but a colour that only has
  // a cutout would blank the whole "Chez vous" band. Falling back to any
  // other colour's room photo keeps the section intact — it is there to show
  // the lamp's scale in a room, and every colour is the same shape.
  const roomPhoto = useMemo(() => {
    return (
      color?.photos[0]?.url ??
      colors.find((candidate) => candidate.photos.length > 0)?.photos[0]?.url ??
      null
    );
  }, [color, colors]);

  useEffect(() => {
    trackViewContent({ id: product.slug, name: product.name, value: product.price });
  }, [product.slug, product.name, product.price]);

  // The confirmation is a transient acknowledgement, not a state of the page —
  // left up it would still be claiming "ajouté" ten minutes later.
  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(() => setJustAdded(false), 5000);
    return () => clearTimeout(timer);
  }, [justAdded]);

  function selectColor(next: number) {
    setIndex(next);
    setJustAdded(false);
  }

  function addToCart() {
    if (!color?.inStock) return;
    addItem(
      {
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        colorId: color.id,
        colorName: color.colorName,
        unitPrice: product.price,
        // Cutout first, matching ProductDetail — the cart renders an 80px
        // tile, where a background-removed lamp reads far better than a
        // shrunken room shot.
        photoUrl: color.cutoutPhotoUrl ?? color.photos[0]?.url ?? null,
      },
      1,
    );
    // After the cart write, so a failed add never reports a phantom
    // AddToCart to Meta.
    trackAddToCart({
      id: product.slug,
      name: product.name,
      value: product.price,
      quantity: 1,
    });
    setJustAdded(true);
  }

  return (
    <div className="lp" data-lit={lit ? "on" : "off"}>
      <nav className="lp-nav">
        <Link href="/" className="lp-nav-brand">
          Naja
        </Link>
        <div className="lp-nav-links">
          <a href="#nuancier">Nuancier</a>
          <a href="#fabrication">Fabrication</a>
          <a href="#questions">Questions</a>
        </div>
        <div className="lp-nav-actions">
          {/* Only once there is something in it. An empty-cart link in the
              default state would be a second button competing with the one
              that matters, and the mockup's nav has exactly one. */}
          {totalQuantity > 0 ? (
            <Link href="/panier" className="lp-btn lp-btn-outline">
              Panier · {totalQuantity}
            </Link>
          ) : null}
          <button
            type="button"
            className="lp-btn lp-btn-primary"
            onClick={addToCart}
            disabled={!inStock}
          >
            {inStock ? (
              <>
                <span className="lp-nav-cta-long">Ajouter au panier · </span>
                {price}
              </>
            ) : (
              "Rupture de stock"
            )}
          </button>
        </div>
      </nav>

      {/* ── Hero poster ─────────────────────────────────────────────────
          Everything colour-and-light here is driven by data-lit on .lp, so
          the whole switch is one attribute and the transitions live in CSS. */}
      <section className="lp-hero lp-band">
        <div className="lp-hero-rail" aria-hidden>
          <span>Fait main · à la commande · Algérie</span>
        </div>

        <div className="lp-hero-grid">
          <div className="lp-hero-copy">
            <p className="lp-hero-tag">
              Lampe nº {product.number} — {product.name}
            </p>

            <h1 className="lp-display">
              <span>{product.name}</span>
              <span className="lp-display-accent">qui s&apos;allume</span>
            </h1>

            <p className="lp-lede">{product.lead}</p>

            <div className="lp-facts">
              <div>
                <span className="lp-eyebrow">Prix</span>
                <span className="lp-price">{price}</span>
              </div>
              <div className="lp-fact-split">
                <span className="lp-eyebrow">Paiement</span>
                <span className="lp-fact-value">En espèces, à la livraison</span>
              </div>
            </div>

            <div className="lp-cta-row">
              <button
                type="button"
                className="lp-btn lp-btn-lg lp-btn-primary"
                onClick={addToCart}
                disabled={!inStock}
              >
                {inStock ? "Ajouter au panier" : "Rupture de stock"}
              </button>
              <button
                type="button"
                className="lp-btn lp-btn-lg lp-btn-hero"
                onClick={() => setLit((on) => !on)}
              >
                {lit ? "Éteindre" : "Allumer la lampe"}
              </button>
            </div>

            <p className="lp-added" aria-live="polite">
              {justAdded ? (
                <>
                  Ajouté au panier ✓ <Link href="/panier">Voir le panier</Link>
                </>
              ) : null}
            </p>
          </div>

          <div className="lp-stage">
            <div className="lp-glow" aria-hidden />

            {color?.cutoutPhotoUrl ? (
              <div className="lp-lamp">
                <Image
                  // Keyed by URL so switching colour genuinely swaps the
                  // element instead of repainting one node's src — see the
                  // note in ProductStage.tsx for what that looked like.
                  key={color.cutoutPhotoUrl}
                  src={color.cutoutPhotoUrl}
                  alt={`${product.name} — ${color.colorName}`}
                  fill
                  // The hero is the LCP element on a page people arrive at
                  // cold from an ad; it must not wait for the lazy pass.
                  priority
                  sizes="(min-width: 1024px) 460px, 80vw"
                  quality={85}
                />
              </div>
            ) : (
              <div className="lp-nophoto">
                <span>
                  {color ? `Photo ${color.colorName}` : "Photo"}
                  <br />à venir
                </span>
              </div>
            )}

            <span className="lp-stage-state">{lit ? "Allumée" : "Éteinte"}</span>
            {color ? <span className="lp-stage-color">{color.colorName}</span> : null}
          </div>
        </div>
      </section>

      {/* ── Nuancier ────────────────────────────────────────────────────
          Radio semantics rather than buttons: these are one choice among
          several, and arrow-key behaviour comes free. */}
      <section id="nuancier" className="lp-band">
        <div className="lp-cols lp-cols-swatches" role="radiogroup" aria-label="Couleur">
          {colors.map((option, optionIndex) => {
            const selected = optionIndex === index;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!option.inStock}
                onClick={() => selectColor(optionIndex)}
                className="lp-swatch"
              >
                <span
                  aria-hidden
                  className="lp-swatch-chip"
                  style={{ background: option.colorHex ?? "#d7d3d3" }}
                />
                <span className="lp-swatch-name">{option.colorName}</span>
                <span className="lp-swatch-note">
                  {!option.inStock
                    ? "En rupture"
                    : selected
                      ? "Sélectionnée"
                      : "Disponible"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <LandingTicker />
      <LandingPromises />
      <LandingFabrication />

      {/* ── The lamp somewhere real ─────────────────────────────────── */}
      <section className="lp-room lp-band">
        <figure className="lp-room-photo">
          {roomPhoto ? (
            <Image
              key={roomPhoto}
              src={roomPhoto}
              alt={`${product.name} posée chez soi`}
              fill
              sizes="100vw"
              quality={85}
            />
          ) : null}
        </figure>
        <div className="lp-room-card">
          <span className="lp-kicker">Chez vous</span>
          <h2>Une lumière chaude, posée là où vous vivez.</h2>
          <p className="lp-body">{product.roomCopy}</p>
        </div>
      </section>

      <LandingFaq />

      {/* ── Closing poster ──────────────────────────────────────────── */}
      <section className="lp-close">
        <h2>
          <span>Allumez-la</span>
          <span>ce soir.</span>
        </h2>
        <div className="lp-cta-row">
          <button
            type="button"
            className="lp-btn lp-btn-lg lp-btn-paper"
            onClick={addToCart}
            disabled={!inStock}
          >
            {inStock ? `Ajouter au panier · ${price}` : "Rupture de stock"}
          </button>
          <Link href="/boutique" className="lp-btn lp-btn-lg lp-btn-quiet">
            Voir toute la collection
          </Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
