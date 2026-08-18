// Colour hexes are admin-entered, so anything unparseable has to come back
// as null and let the caller fall back — a malformed value must never end up
// interpolated into a gradient or background, where it would silently
// invalidate the whole declaration.
export function hexToRgba(hex: string | null | undefined, alpha: number): string | null {
  const raw = hex?.replace("#", "").trim() ?? "";
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// The brand's "switched on" warm (--lueur) as an rgba literal, for the cases
// that need it inside a computed background rather than as a CSS class.
export const LUEUR_RGB = "242, 166, 90";
