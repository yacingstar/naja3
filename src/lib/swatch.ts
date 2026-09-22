import type { CSSProperties } from "react";

// How a colour is painted where the mark is too small to be a drawn lamp:
// the 14px dot beside a name on the ad landing page, and the second-hue dot on
// a catalogue card. The picker itself draws a real lamp instead — see
// components/LampMark.tsx — and that is the only place with room for one.
//
// A duo splits top / bottom rather than on the diagonal, so it agrees with the
// lamp: first hue above, second below. Hard-edged, never blended — a gradient
// would read as a third colour the lamp does not have.
export function swatchStyle(hex: string | null, hex2: string | null): CSSProperties {
  // Falls back to the same beige the picker shows for a colour whose hex was
  // never filled in — see the thirty-second round in CONTEXT.md.
  const base = hex ?? "#e5d9cf";
  if (!hex2) return { backgroundColor: base };
  return { backgroundImage: `linear-gradient(to bottom, ${base} 0 50%, ${hex2} 50% 100%)` };
}
