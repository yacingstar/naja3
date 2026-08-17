const SIZE_CLASS = {
  lg: "w-56 sm:w-72",
  sm: "w-20 sm:w-24",
  xs: "w-12 sm:w-14",
} as const;

// Hand-built inline SVG, not a photo — there's no real product photo to use
// yet (catalog is empty until admin data entry), and an illustration in the
// brand palette sits more consistently with the blob-glow signature than a
// stock image would. Same component for both the floating hero lamp and the
// smaller hanging one — same object, varied by size/position/animation.
export function LampIllustration({
  size = "lg",
  className = "",
}: {
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  return (
    <div className={`relative ${SIZE_CLASS[size]} ${className}`}>
      <div
        aria-hidden
        className="absolute inset-x-4 top-1/3 bottom-2 -z-10 rounded-full bg-lueur/40 blur-2xl"
      />
      <svg viewBox="0 0 200 260" className="relative h-auto w-full" aria-hidden>
        <line
          x1="100"
          y1="0"
          x2="100"
          y2="62"
          stroke="var(--encre)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M100,60 C78,60 65,90 62,130 C60,155 62,170 70,180 A 40,15 0 0 0 130,180 C138,170 140,155 138,130 C135,90 122,60 100,60 Z"
          fill="var(--lueur)"
        />
        <ellipse cx="100" cy="179" rx="19" ry="6" fill="var(--papier)" opacity="0.85" />
      </svg>
    </div>
  );
}
