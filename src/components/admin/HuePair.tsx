"use client";

import { LampMark } from "@/components/LampMark";

// The colour controls for one variant: a hue, an optional second hue that
// makes it bicolour, and a live preview of the swatch the customer will see.
//
// Bicolour is modelled as "this one variant has two hues", not as "the
// customer combines two colours". That is why it is a single row here: the
// duo keeps its own name, its own photos and its own in-stock toggle, and an
// order records it exactly like any plain colour.
//
// The two fields are labelled "Abat-jour" and "Pied" once the box is ticked,
// not "hue 1" and "hue 2": the swatch draws a lamp, so which field is which
// has a visible consequence and the form should say it outright.
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
        <span className="mb-1 block text-xs font-medium text-encre/70">
          {bicolour ? "Abat-jour" : "Teinte"}
        </span>
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange({ colorHex: e.target.value, colorHex2: hex2 })}
          className="h-10 w-14 rounded border border-encre/20"
        />
      </label>

      {bicolour ? (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-encre/70">Pied</span>
          <input
            type="color"
            value={hex2}
            onChange={(e) => onChange({ colorHex: hex, colorHex2: e.target.value })}
            className="h-10 w-14 rounded border border-encre/20"
          />
        </label>
      ) : null}

      <label className="flex items-center gap-2 pb-2 text-sm" htmlFor={`${idPrefix}-bicolore`}>
        <input
          id={`${idPrefix}-bicolore`}
          type="checkbox"
          checked={bicolour}
          // Unchecking clears the second hue rather than remembering it: the
          // stored value is what the storefront reads, so a hidden leftover
          // would keep the swatch two-toned.
          onChange={(e) =>
            onChange({ colorHex: hex, colorHex2: e.target.checked ? "#ffffff" : null })
          }
        />
        Bicolore
      </label>

      <div className="pb-1">
        <span className="mb-1 block text-xs font-medium text-encre/70">Aperçu</span>
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-encre/15 bg-papier">
          <LampMark hex={hex} hex2={hex2} className="h-8 w-8" />
        </span>
      </div>
    </>
  );
}
