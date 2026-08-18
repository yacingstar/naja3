import type { SVGProps } from "react";

// Same drawing grammar as the trust strip's icons — 24x24 box, 1.5 stroke,
// round caps and joins, no fills — so the header, the strip and anywhere
// else read as one set rather than borrowed clip art.

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

// A tote rather than a supermarket trolley: this shop hand-packs orders, and
// a soft bag sits closer to that than a wire cart would.
export function BagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5.2 7.5h13.6l-1.05 12.05a1.5 1.5 0 0 1-1.5 1.35H7.75a1.5 1.5 0 0 1-1.5-1.35z" />
      <path d="M8.75 10V6.6a3.25 3.25 0 0 1 6.5 0V10" />
    </svg>
  );
}
