"use client";

import type { ProductColorDetail } from "@/lib/products";

// The colour picker, pulled out of DirectOrderForm so the detail page can
// render it up beside the photo instead — the client's point being that you
// pick a colour by looking at the lamp, so the two belong next to each other.
//
// Swatches carry no visible name any more, also at her request. The name is
// still reachable three ways, because a bare dot is not self-explanatory:
// `aria-label` for screen readers, `title` on hover, and the selected one
// spelled out underneath. Losing all three would make the picker unusable
// for anyone who cannot distinguish the colours.
export function ColorSwatches({
  colors,
  selectedColorId,
  onSelectColor,
  className = "",
  centered = false,
}: {
  colors: ProductColorDetail[];
  selectedColorId: number | undefined;
  onSelectColor: (id: number) => void;
  className?: string;
  // The detail page centres these under the photo; the landing page's
  // form keeps them left-aligned with the rest of its fields.
  centered?: boolean;
}) {
  const selectedColor = colors.find((c) => c.id === selectedColorId) ?? colors[0];

  if (colors.length === 0) return null;

  return (
    <div className={className}>
      <div
        role="radiogroup"
        aria-label="Couleur"
        className={`flex flex-wrap gap-2.5 ${centered ? "justify-center" : ""}`}
      >
        {colors.map((color) => {
          const isSelected = color.id === selectedColor?.id;
          const label = color.inStock
            ? color.colorName
            : `${color.colorName} (rupture)`;

          return (
            <button
              key={color.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={label}
              title={label}
              disabled={!color.inStock}
              onClick={() => onSelectColor(color.id)}
              // The ring sits outside the swatch so the colour itself is never
              // covered by its own selected state.
              className={`relative h-10 w-10 rounded-full border transition ${
                isSelected
                  ? "border-encre/20 ring-2 ring-encre ring-offset-2 ring-offset-papier"
                  : "border-encre/20"
              } ${
                color.inStock
                  ? "hover:ring-2 hover:ring-encre/30 hover:ring-offset-2 hover:ring-offset-papier"
                  : "cursor-not-allowed opacity-40"
              }`}
              style={{ backgroundColor: color.colorHex ?? "#e5d9cf" }}
            >
              {isSelected ? (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="absolute inset-0 m-auto h-5 w-5 text-papier drop-shadow-[0_0_1.5px_rgba(58,46,54,0.95)]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 12.5l5 5L20 6.5" />
                </svg>
              ) : null}

              {/* Out of stock reads as a struck-through dot, so it is not
                  carried by the faded opacity alone. */}
              {!color.inStock ? (
                <span
                  aria-hidden
                  className="absolute inset-0 m-auto h-[1.5px] w-7 rotate-45 rounded-full bg-encre/70"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {selectedColor ? (
        <p className={`mt-2.5 text-sm text-encre/60 ${centered ? "text-center" : ""}`}>
          {selectedColor.colorName}
          {!selectedColor.inStock ? " — rupture" : ""}
        </p>
      ) : null}
    </div>
  );
}
