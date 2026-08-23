"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

// One button for the whole admin, because the complaint was that clicking
// something gave no sign anything had happened — you'd sit there wondering
// whether the click registered, then click again.
//
// Three things every button here now does:
//   - presses in (active:scale-[0.97]) so the click itself is felt
//   - shows a spinner and swaps its label while the action is in flight
//   - blocks further clicks while pending, so spamming it can't fire the
//     same server action five times
//
// `pending` is driven by the caller's useTransition/useState, so the spinner
// tracks the real server round-trip rather than a guessed timeout.
type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-lueur text-encre shadow-sm hover:bg-lueur/90",
  secondary: "border border-encre/20 text-encre hover:border-encre hover:bg-encre/5",
  danger: "border border-red-300 text-red-700 hover:bg-red-50 hover:border-red-500",
  ghost: "text-encre/50 hover:text-encre hover:bg-encre/5",
};

export function AdminButton({
  children,
  variant = "primary",
  pending = false,
  pendingLabel,
  size = "md",
  className = "",
  disabled,
  ...props
}: {
  children: ReactNode;
  variant?: Variant;
  pending?: boolean;
  pendingLabel?: string;
  size?: "sm" | "md";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizing = size === "sm" ? "px-3.5 py-1.5 text-xs" : "px-6 py-2.5 text-sm";

  return (
    <button
      {...props}
      disabled={disabled || pending}
      // aria-busy so assistive tech announces the wait, not just sighted users
      aria-busy={pending || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${sizing} ${VARIANTS[variant]} ${className}`}
    >
      {pending ? <Spinner /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={`h-3.5 w-3.5 shrink-0 animate-spin ${className}`}
      fill="none"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path
        d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
