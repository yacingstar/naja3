// Product photo treatment: a soft rounded-square card with a warm glow
// behind it, like it's actually plugged in. object-contain, not cover —
// product shots come in whatever aspect ratio they're shot in (e.g. a 2:3
// portrait product photo), and cover was cropping into the lamp itself
// rather than just trimming background.
//
// The panel is `papier`, matching the page and ProductCard's photo inset.
// It used to be `blush`: with a portrait photo in a square box,
// object-contain letterboxes it, and those bars rendered as two hard pink
// slabs either side of the shot — read as a bug rather than a treatment.
// `tint="blush"` keeps the pink for the empty/no-photo case, where a
// tinted card is the point rather than an accident.
export function BlobPhoto({
  src,
  alt,
  tint,
  className = "",
}: {
  src?: string | null;
  alt: string;
  tint?: "papier" | "blush";
  className?: string;
}) {
  // No photo and no explicit choice: fall back to the tinted card so the
  // slot still reads as deliberate rather than as a blank hole.
  const panel = (tint ?? (src ? "papier" : "blush")) === "blush" ? "bg-blush" : "bg-papier";

  return (
    <div className={`relative ${className}`}>
      <div aria-hidden className="blob-photo absolute inset-4 bg-lueur/50 blur-2xl" />
      <div
        className={`blob-photo relative aspect-square overflow-hidden ${panel}`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URLs, revisit with next/image once real photos exist (Phase 3/5)
          <img src={src} alt={alt} className="h-full w-full object-contain" />
        ) : null}
      </div>
    </div>
  );
}
