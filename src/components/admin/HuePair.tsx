"use client";

import { swatchStyle } from "@/lib/swatch";

// The colour controls for one variant: a hue, an optional second hue that
// makes it bicolour, and a live preview of the swatch the customer will see.
//
// Bicolour is modelled as "this one variant has two hues", not as "the
// customer combines two colours". That is why it is a single row here: the
// duo keeps its own name, its own photos and its own in-stock toggle, and an
// order records it exactly like any plain colour.
export function HuePair({
  hex,
  hex2,
  onChange,
  idPrefix,
}: {
  hex: string;
  hex2: string | null;
  onChange: (next: { colorHex: string; colorHex2: string | null }) => void;
  // Checkbox needs a label association that survives several rows on a page.
  idPrefix: string;
}) {
  const bicolour = hex2 !== null;

  return (
    <>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-encre/70">Teinte</span>
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange({ colorHex: e.target.value, colorHex2: hex2 })}
          className="h-10 w-14 rounded border border-encre/20"
        />
      </label>

      <label className="flex items-center gap-2 pb-2 text-sm" htmlFor={`${idPrefix}-bicolore`}>
        <input
          id={`${idPrefix}-bicolore`}
          type="checkbox"
          checked={bicolour}
          // Unchecking clears the second hue rather than remembering it: the
          // stored value is what the storefront reads, so a hidden leftover
          // would keep the swatch split.
          onChange={(e) =>
            onChange({ colorHex: hex, colorHex2: e.target.checked ? "#ffffff" : null })
          }
        />
        Bicolore
      </label>

      {bicolour ? (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-encre/70">2ᵉ teinte</span>
          <input
            type="color"
            value={hex2}
            onChange={(e) => onChange({ colorHex: hex, colorHex2: e.target.value })}
            className="h-10 w-14 rounded border border-encre/20"
          />
        </label>
      ) : null}

      <div className="pb-1">
        <span className="mb-1 block text-xs font-medium text-encre/70">Aperçu</span>
        <span
          aria-hidden
          className="block h-10 w-10 rounded-full border border-encre/20"
          style={swatchStyle(hex, hex2)}
        />
      </div>
    </>
  );
}
