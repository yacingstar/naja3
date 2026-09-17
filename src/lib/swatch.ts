import type { CSSProperties } from "react";

// One definition of how a colour is painted, shared by the storefront swatch
// and the admin's preview of it. Kept in a single place on purpose: the whole
// value of the admin preview is that it is the same pixels the customer gets,
// and two copies of this would drift the first time either is tweaked.
//
// A plain colour is a flat fill. A bicolour variant is split on the diagonal,
// first hue top-left, second bottom-right — hard-edged rather than blended,
// because a gradient would read as a third colour that the lamp does not have.
export function swatchStyle(hex: string | null, hex2: string | null): CSSProperties {
  // Falls back to the same beige the picker shows for a colour whose hex was
  // never filled in — see the thirty-second round in CONTEXT.md.
  const base = hex ?? "#e5d9cf";
  if (!hex2) return { backgroundColor: base };
  return { backgroundImage: `linear-gradient(135deg, ${base} 0 50%, ${hex2} 50% 100%)` };
}
