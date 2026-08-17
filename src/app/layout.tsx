import type { Metadata } from "next";
import { Fredoka, Work_Sans, Caveat } from "next/font/google";
import "./globals.css";

// Static weights, not "variable" — Safari has a known bug where a
// variable font's `wght` axis doesn't reliably respond to `font-weight`
// (confirmed here: Hero's h1, the one spot using `font-bold`, rendered
// visibly thin under real WebKit mobile emulation despite
// `getComputedStyle` correctly reporting `font-weight: 700` — the CSS
// value was right, the interpolated glyph weight wasn't). Static weight
// files sidestep that entirely. Only the weights actually used in the
// app are requested: 400 (every heading without an explicit weight
// class) and 700 (only Hero.tsx's `font-bold` h1).
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// 400 (body copy) and 500 (`font-medium`, used ~50x for buttons/nav/labels).
const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Sparingly, small handwritten touches only — never body copy. Always
// used at its default weight, no bold/medium variants anywhere.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Naja",
  description: "Lampes imprimées en 3D, fabriquées à la commande.",
};

// Deliberately bare: no Header/Footer here. (site) and admin each get their
// own layout below, so admin never inherits the storefront's chrome.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${fredoka.variable} ${workSans.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body">{children}</body>
    </html>
  );
}
