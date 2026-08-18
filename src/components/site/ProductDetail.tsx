"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ProductStage, type StageView } from "@/components/site/ProductStage";
import { useCart } from "@/lib/cart";
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
// is the question that decides whether they add to cart at all.
const REASSURANCE = [
  "Paiement à la livraison, partout en Algérie",
  "Imprimée à la commande, rien n'est fait en série",
  "Emballée à la main avant l'envoi",
];

// One client component owns the whole two-column layout, rather than a
// gallery component per column. Colour selection drives the photo, the
// thumbnails AND what goes in the cart, so a single state owner avoids
// lifting that selection through the server page.
//
// This replaced ProductGallery.tsx, which rendered the photo, the colour
// picker, the quantity stepper and the add-to-cart button all into the
// grid's LEFT cell — so the right cell held only a title, a price and a
// paragraph, and the bottom two thirds of it were empty. That empty half
// was the "feels empty and weird".
export function ProductDetail({
  product,
  colors,
}: {
  product: ProductSummary;
  colors: ProductColorDetail[];
}) {
  const { addItem } = useCart();
  const [selectedColorId, setSelectedColorId] = useState(colors[0]?.id);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

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
    setJustAdded(false);
  }

  function handleAddToCart() {
    if (!selectedColor?.inStock) return;
    addItem(
      {
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        colorId: selectedColor.id,
        colorName: selectedColor.colorName,
        unitPrice: product.price,
        // Cutout first: the cart shows an 80px thumbnail on a papier tile,
        // where a background-removed lamp reads far better than a shrunken
        // studio shot with its own backdrop.
        photoUrl: selectedColor.cutoutPhotoUrl ?? selectedColor.photos[0]?.url ?? null,
      },
      quantity,
    );
    setJustAdded(true);
    setQuantity(1);
  }

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
            tintHex={selectedColor?.colorHex ?? null}
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
          <>
            {/* Selected colour named in full next to the label — the
                swatch alone leaves you guessing on close hues like
                "Rouge" vs "Rouge Rose". */}
            <div className="mt-8">
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-heading text-sm tracking-wide text-encre/55 uppercase">
                  Couleur
                </p>
                <p className="text-sm text-encre/70">{selectedColor.colorName}</p>
              </div>

              <div
                role="radiogroup"
                aria-label="Couleur"
                className="mt-3 flex flex-wrap gap-2.5"
              >
                {colors.map((color) => {
                  const isSelected = color.id === selectedColor.id;
                  return (
                    <button
                      key={color.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={!color.inStock}
                      onClick={() => selectColor(color.id)}
                      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                        isSelected
                          ? "border-encre bg-papier shadow-sm"
                          : "border-encre/20"
                      } ${
                        color.inStock
                          ? "hover:border-encre"
                          : "cursor-not-allowed opacity-50"
                      }`}
                    >
                      <span
                        aria-hidden
                        className="h-3.5 w-3.5 rounded-full border border-encre/20"
                        style={{ backgroundColor: color.colorHex ?? "#e5d9cf" }}
                      />
                      {color.colorName}
                      {!color.inStock ? (
                        <span className="text-xs text-encre/50">(rupture)</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Diminuer la quantité"
                  className="h-10 w-10 rounded-full border border-encre/20 transition hover:border-encre"
                >
                  −
                </button>
                <span className="w-6 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Augmenter la quantité"
                  className="h-10 w-10 rounded-full border border-encre/20 transition hover:border-encre"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!selectedColor.inStock}
                className="flex-1 rounded-full bg-lueur px-8 py-3.5 text-sm font-medium text-encre shadow-sm transition hover:bg-lueur/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {selectedColor.inStock ? "Ajouter au panier" : "Rupture de stock"}
              </button>
            </div>

            {/* Fixed-height slot: without it the confirmation appearing
                shoves the reassurance list down the moment you add to
                cart, right where you're looking. */}
            <div className="mt-3 h-6" aria-live="polite">
              {justAdded ? (
                <p className="text-sm text-sauge">
                  Ajouté au panier ✓{" "}
                  <Link href="/panier" className="underline hover:text-encre">
                    Voir le panier
                  </Link>
                </p>
              ) : null}
            </div>
          </>
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
