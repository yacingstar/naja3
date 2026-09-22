"use client";

import type { ProductColorDetail } from "@/lib/products";
import { LampMark } from "@/components/LampMark";

// The colour picker, pulled out of DirectOrderForm so the detail page can
// render it up beside the photo instead — the client's point being that you
// pick a colour by looking at the lamp, so the two belong next to each other.
//
// Each swatch draws a little lamp rather than a coloured disc, which is what
// lets a duo say where its two hues go: shade above, base below. The disc it
// replaces split on the diagonal and meant nothing.
//
// Swatches carry no visible name, at her request. The name is still reachable
// three ways, because a bare mark is not self-explanatory: `aria-label` for
// screen readers, `title` on hover, and the selected one spelled out
// underneath. Losing all three would make the picker unusable for anyone who
// cannot distinguish the colours.
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
              // The ring sits outside the swatch so the lamp is never covered
              // by its own selected state. There is deliberately no tick any
              // more: on a duo with a white half it disappeared into the
              // colour it was meant to mark.
              className={`relative flex h-11 w-11 items-center justify-center rounded-full border bg-papier transition duration-200 ease-out ${
                isSelected
                  ? "scale-105 border-encre/20 ring-2 ring-encre ring-offset-2 ring-offset-papier"
                  : "border-encre/15"
              } ${
                color.inStock
                  ? "hover:scale-105 hover:border-encre/40 active:scale-95"
                  : "cursor-not-allowed opacity-40"
              }`}
            >
              <LampMark hex={color.colorHex} hex2={color.colorHex2} className="h-8 w-8" />

              {/* Out of stock reads as a struck-through mark, so it is not
                  carried by the faded opacity alone. */}
              {!color.inStock ? (
                <span
                  aria-hidden
                  className="absolute inset-0 m-auto h-[1.5px] w-8 rotate-45 rounded-full bg-encre/70"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {selectedColor ? (
        <p
          className={`mt-2.5 text-sm text-encre/60 ${centered ? "text-center" : ""}`}
        >
          {selectedColor.colorName}
          {!selectedColor.inStock ? " — rupture" : ""}
        </p>
      ) : null}
    </div>
  );
}
