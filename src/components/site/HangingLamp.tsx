import type { CSSProperties, ReactNode } from "react";

// One item suspended from a cord in the hero, à la aardvarkbookclub.com's
// row of hanging book covers. Deliberately content-agnostic (takes
// `children`) so Hero.tsx can hang either a real product photo or the
// LampIllustration fallback through the exact same cord + swing rig.
//
// `--swing-duration` / `--drop-delay` are per-instance (set by Hero.tsx's
// LAMP_RIG table) and drive the shared `.hanging-lamp` animation in
// globals.css — durations differ per lamp so the row never swings in
// lockstep, same trick as the background blobs in WavyBackground.tsx.
export function HangingLamp({
  cordLength,
  swingDuration,
  dropDelay,
  className = "",
  children,
}: {
  // A CSS length, not a number — Hero.tsx passes clamp() expressions so
  // cords scale with the viewport without a second mobile rig.
  cordLength: string;
  swingDuration: string;
  dropDelay: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={
        {
          "--swing-duration": swingDuration,
          "--drop-delay": dropDelay,
        } as CSSProperties
      }
      className={`hanging-lamp flex-col items-center ${className}`}
    >
      {/* The cord. Starts at the section's very top edge, so it reads as
          hanging from off-screen rather than floating from nowhere. */}
      <span
        aria-hidden
        style={{ height: cordLength }}
        className="w-px shrink-0 bg-encre/30"
      />
      {children}
    </div>
  );
}
