const BLOB_CLASS = {
  a: "blob-a",
  b: "blob-b",
  c: "blob-c",
} as const;

type BlobVariant = keyof typeof BLOB_CLASS;

// The signature treatment: an organic blob shape (not a rounded rectangle)
// with a soft warm glow behind it, like it's actually plugged in. Falls back
// to a plain blush-tinted blob when there's no photo yet (no image upload
// pipeline until Phase 5).
export function BlobPhoto({
  src,
  alt,
  variant = "a",
  className = "",
}: {
  src?: string | null;
  alt: string;
  variant?: BlobVariant;
  className?: string;
}) {
  const blob = BLOB_CLASS[variant];

  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden
        className={`absolute inset-4 bg-lueur/50 blur-2xl ${blob}`}
      />
      <div className={`relative aspect-square overflow-hidden bg-blush ${blob}`}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URLs, revisit with next/image once real photos exist (Phase 3/5)
          <img src={src} alt={alt} className="h-full w-full object-cover" />
        ) : null}
      </div>
    </div>
  );
}
