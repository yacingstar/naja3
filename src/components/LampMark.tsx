// The swatch mark: a lamp, not a disc. Shared by the storefront picker and by
// the admin's preview of it, so what she sets is what the customer sees.
//
// The point of drawing a lamp is that it can say WHERE each hue goes. A duo is
// shade over base — the way her lamps are actually two-toned (Akari: white
// shade, navy base) — so the first hue is the shade and the second is the base.
// A plain colour paints the whole lamp in one hue. The diagonal split this
// replaces said nothing: no lamp is ever tinted corner to corner.
export function LampMark({
  hex,
  hex2,
  className = "",
}: {
  hex: string | null;
  hex2: string | null;
  className?: string;
}) {
  // Same beige a colour with no hex falls back to elsewhere — an unfilled
  // colour is a real state in her admin, not a bug to render as black.
  const shade = hex ?? "#e5d9cf";
  const base = hex2 ?? shade;

  return (
    <svg viewBox="0 0 40 40" aria-hidden className={className}>
      {/* Every part is outlined: "Blanc" is one of her colours, and a white
          lamp on the cream page would otherwise be an empty hole. */}
      <path
        d="M10.5 17.5 L15.5 7.5 L24.5 7.5 L29.5 17.5 Z"
        fill={shade}
        stroke="rgba(58,46,54,0.3)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <rect
        x="16.75"
        y="19"
        width="6.5"
        height="12"
        rx="3.25"
        fill={base}
        stroke="rgba(58,46,54,0.3)"
        strokeWidth="1"
      />
    </svg>
  );
}
