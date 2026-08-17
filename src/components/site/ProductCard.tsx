import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import { formatPrice } from "@/lib/format";
import type { FeaturedProduct } from "@/lib/products";

// Each card rests at its own slight independent angle ("like scattered
// cards") rather than sitting dead straight. Passed through as the
// --card-rotate custom property so the shared .product-card CSS
// (globals.css) can both set the resting tilt and re-centre the hover
// wobble keyframes on it.
const ROTATIONS = [-3, 2.5, -2, 3, -1.5, 2] as const;

// Solid card colours, aardvarkbookclub.com-style — their cards are a
// block of saturated colour with the cover inset on top of it, rather
// than a white card with a tinted photo panel. Naja's palette is
// deliberately softer than aardvark's (brand decision from the original
// brief, not an oversight), so these are the brand's own hues at full
// strength rather than new louder ones invented to match.
const CARD_BG = [
  "bg-blush",
  "bg-sauge",
  "bg-crepuscule",
  "bg-lueur",
] as const;

// Colour swatches double as aardvark's genre pills here — same visual
// device (a row of small multi-coloured tags under the image), driven by
// data the catalogue already has. Colour hexes are admin-entered and can
// land anywhere from near-white to near-black, so the label colour is
// derived from the swatch's own relative luminance (WCAG formula) rather
// than hardcoded — otherwise "Ivoire" or "Charbon" would be unreadable.
function labelColorOn(hex: string | null): string {
  const raw = hex?.replace("#", "") ?? "";
  if (raw.length !== 6) return "var(--encre)";
  const channels = [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16) / 255);
  if (channels.some(Number.isNaN)) return "var(--encre)";
  const linear = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  const luminance =
    0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return luminance > 0.45 ? "var(--encre)" : "var(--papier)";
}

export function ProductCard({
  product,
  index,
}: {
  product: FeaturedProduct;
  index: number;
}) {
  const rotateStyle = {
    "--card-rotate": `${ROTATIONS[index % ROTATIONS.length]}deg`,
  } as CSSProperties;

  return (
    <Reveal delay={(index % 5) * 80}>
      <Link
        href={`/boutique/${product.slug}`}
        style={rotateStyle}
        className={`product-card group block overflow-hidden rounded-3xl p-3 shadow-md transition-shadow duration-300 hover:shadow-xl ${
          CARD_BG[index % CARD_BG.length]
        }`}
      >
        {/* Photo inset on top of the colour block, so the card colour
            frames it on all sides — the aardvark cover treatment. */}
        <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-papier p-6">
          <div aria-hidden className="absolute inset-8 rounded-full bg-lueur/30 blur-2xl" />
          {product.photoUrl ? (
            // `fill` resolves against the nearest positioned ancestor's
            // PADDING box, so pointing it at the panel above would push the
            // photo out under that panel's p-6 and enlarge it. This inner
            // wrapper is a flex child, so it lands on the content box and
            // the framing stays exactly as it was.
            <div className="relative h-full w-full">
              <Image
                src={product.photoUrl}
                alt={product.name}
                fill
                // Cards cap out around 288px wide (w-80 in the carousel, a
                // third of max-w-6xl in the /boutique grid) minus the card
                // and panel padding. Without `sizes` the browser assumes
                // 100vw and pulls a needlessly huge file.
                sizes="(min-width: 640px) 288px, 280px"
                quality={85}
                // Only the first couple of cards are on screen — in the
                // homepage carousel the rest are off to the right, and in
                // the /boutique grid they're below the fold. The leading
                // cards stay eager on purpose: one of them is the LCP
                // element on /boutique, and lazy images are fetched at
                // lower priority.
                loading={index < 2 ? "eager" : "lazy"}
                className="object-contain transition-transform duration-500 ease-out group-hover:scale-110"
              />
            </div>
          ) : null}
        </div>

        <div className="px-2 pt-4 pb-2">
          {product.colors.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {product.colors.map((color) => (
                <span
                  key={color.id}
                  style={{
                    backgroundColor: color.colorHex ?? "#e5d9cf",
                    color: labelColorOn(color.colorHex),
                  }}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    color.inStock ? "" : "opacity-40"
                  }`}
                >
                  {color.colorName}
                </span>
              ))}
            </div>
          ) : null}

          <h3 className="mt-3 font-heading text-2xl leading-tight font-bold text-encre">
            {product.name}
          </h3>

          {product.description ? (
            <p className="mt-2 line-clamp-3 text-sm leading-snug text-encre/75">
              {product.description}
            </p>
          ) : null}

          <p className="mt-3 font-heading text-lg font-bold text-encre">
            {formatPrice(product.price)}
          </p>
        </div>
      </Link>
    </Reveal>
  );
}
