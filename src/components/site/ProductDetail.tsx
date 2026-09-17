"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DirectOrderForm } from "@/components/site/DirectOrderForm";
import { ColorSwatches } from "@/components/site/ColorSwatches";
import { ProductStage, type StageView } from "@/components/site/ProductStage";
import { trackViewContent } from "@/lib/analytics";
import type { DeliveryRate } from "@/lib/deliveryRates";
import { formatPrice } from "@/lib/format";
import type { ProductColorDetail } from "@/lib/products";

type ProductSummary = {
  id: number;
  slug: string;
  name: string;
  price: number;
  description: string;
};

// Reassurance repeated from the homepage's trust strip. Deliberate
// duplication: a customer landing straight on a product page from a
// shared link never sees the homepage, and "do I pay now or on delivery?"
// is the question that decides whether they fill the order form at all.
const REASSURANCE = [
  "Paiement à la livraison, partout en Algérie",
  "Imprimée à la commande, rien n'est fait en série",
  "Emballée à la main avant l'envoi",
];

// One client component owns the whole two-column layout, rather than a
// gallery component per column. Colour selection drives the photo, the
// thumbnails AND the order, so a single state owner avoids lifting that
// selection through the server page.
//
// The buying half of this file now lives in DirectOrderForm — the page takes
// the order inline instead of adding to a cart (see that file for why).
// Colour selection stays here rather than moving down with it, because the
// photo on the left depends on it too; the form receives it as a controlled
// value.
export function ProductDetail({
  product,
  colors,
  rates,
}: {
  product: ProductSummary;
  colors: ProductColorDetail[];
  rates: DeliveryRate[];
}) {
  const [selectedColorId, setSelectedColorId] = useState(colors[0]?.id);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Colors come pre-sorted in-stock-first (see getProductBySlug), so the
  // default selection is always something a customer can actually buy.
  const selectedColor = colors.find((c) => c.id === selectedColorId) ?? colors[0];

  // The cutout leads, with the real backdrop shots behind it. Two reasons
  // it goes first rather than replacing them: it's the view ProductStage
  // can actually light (no background of its own to fight), and it shows
  // the lamp's true silhouette, which is what someone is deciding on.
  // The photographed-in-a-room shots are still one tap away.
  const views: StageView[] = selectedColor
    ? [
        ...(selectedColor.cutoutPhotoUrl
          ? [{ kind: "cutout" as const, url: selectedColor.cutoutPhotoUrl }]
          : []),
        ...selectedColor.photos.map((p) => ({ kind: "photo" as const, url: p.url })),
      ]
    : [];
  const view = views[photoIndex] ?? views[0] ?? null;

  function selectColor(id: number) {
    setSelectedColorId(id);
    setPhotoIndex(0);
  }

  // ViewContent tells Meta which lamp was looked at and what it is worth —
  // the signal it uses to find people interested in this kind of product.
  useEffect(() => {
    trackViewContent({ id: product.slug, name: product.name, value: product.price });
  }, [product.slug, product.name, product.price]);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
      {/* ── Left: the photo ─────────────────────────────────────────── */}
      <div className="lg:sticky lg:top-28">
        <div className="mx-auto w-full max-w-lg">
          <ProductStage
            view={view}
            alt={
              selectedColor
                ? `${product.name} — ${selectedColor.colorName}`
                : product.name
            }
            // Capped at max-w-lg (512px) on desktop; full column width
            // below that, since the grid collapses to one column.
            sizes="(min-width: 640px) 512px, 100vw"
          />
        </div>

        {views.length > 1 ? (
          <div className="mt-5 flex justify-center gap-3">
            {views.map((v, index) => (
              <button
                key={v.url}
                type="button"
                onClick={() => setPhotoIndex(index)}
                aria-label={v.kind === "cutout" ? "La lampe seule" : `Photo ${index}`}
                aria-current={index === photoIndex}
                className={`h-16 w-16 overflow-hidden rounded-2xl border-2 bg-papier transition ${
                  index === photoIndex
                    ? "border-lueur"
                    : "border-encre/10 hover:border-encre/30"
                }`}
              >
                <Image
                  src={v.url}
                  alt=""
                  width={64}
                  height={64}
                  sizes="64px"
                  quality={85}
                  // contain for the cutout (cover would crop the lamp out
                  // of its own transparent margins), cover for real photos.
                  className={`h-full w-full ${
                    v.kind === "cutout" ? "object-contain p-1" : "object-cover"
                  }`}
                />
              </button>
            ))}
          </div>
        ) : null}
        {/* Colour sits here, under the photo, rather than down in the order
            slip: you pick a colour by looking at the lamp, and each colour
            swaps the photo above. Keeping the two a screen apart made you
            choose blind. The form is told not to repeat the step. */}
        {colors.length > 0 ? (
          <div className="mt-7">
            <p className="text-center font-heading text-base">
              Choisissez la couleur
            </p>
            <ColorSwatches
              colors={colors}
              selectedColorId={selectedColor?.id}
              onSelectColor={selectColor}
              centered
              className="mt-3"
            />
          </div>
        ) : null}

      </div>

      {/* ── Right: everything you decide with ───────────────────────── */}
      <div>
        <nav aria-label="Fil d'Ariane" className="text-sm text-encre/50">
          <Link href="/boutique" className="transition hover:text-encre">
            Boutique
          </Link>
          <span aria-hidden> / </span>
          <span className="text-encre/70">{product.name}</span>
        </nav>

        <p className="mt-5 font-hand text-xl text-crepuscule">
          fait main, à la commande
        </p>
        <h1 className="mt-1 font-heading text-4xl leading-tight font-bold sm:text-5xl">
          {product.name}
        </h1>
        <p className="mt-3 font-heading text-2xl text-encre">
          {formatPrice(product.price)}
        </p>

        {product.description ? (
          <p className="mt-6 max-w-prose leading-relaxed whitespace-pre-line text-encre/75">
            {product.description}
          </p>
        ) : null}

        {selectedColor ? (
          <DirectOrderForm
            product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
            }}
            colors={colors}
            selectedColorId={selectedColor.id}
            onSelectColor={selectColor}
            showColorStep={false}
            rates={rates}
          />
        ) : (
          <p className="mt-8 text-sm text-encre/60">
            Cette lampe n&apos;a pas encore de coloris en ligne — repassez très bientôt.
          </p>
        )}

        <ul className="mt-8 space-y-2.5 border-t border-dashed border-encre/15 pt-6">
          {REASSURANCE.map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-sm text-encre/70">
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="mt-0.5 h-4 w-4 shrink-0 text-lueur"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 12.5l5 5L20 6.5" />
              </svg>
              {line}
            </li>
          ))}
        </ul>

        <p className="mt-5 text-sm">
          <Link
            href="/#comment-c-est-fait"
            className="text-encre/60 underline transition hover:text-encre"
          >
            Comment cette lampe est fabriquée
          </Link>
        </p>
      </div>
    </div>
  );
}
