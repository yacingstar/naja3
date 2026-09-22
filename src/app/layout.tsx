import type { Metadata } from "next";
import { Fredoka, Work_Sans, Caveat } from "next/font/google";
import "./globals.css";

// Weights are pinned to the ones actually used: Fredoka 400 (every heading
// without an explicit weight class) and 700 (only Hero.tsx's `font-bold`
// h1); Work Sans 400 (body) and 500 (`font-medium`, ~50 uses); Caveat 400.
// Pinning keeps the payload down — Google subsets the variable axis to the
// requested range, and dropping these lists measured +24KB of font data for
// no observed benefit.
//
// Correcting the note that used to live here, which claimed this gives you
// STATIC weight files and therefore dodges Safari's variable-font handling.
// It does not. Google serves one variable woff2 either way and next/font
// declares it once per weight: in the built CSS the 400 and 700 Fredoka
// @font-face rules have byte-identical `src` URLs. So that reasoning never
// held, and the setup here is the ordinary `wght@400;700` arrangement that
// Google Fonts hands out by default.
//
// The "bold renders thin in Safari" symptom does reproduce in Playwright's
// WebKit — but that build applies no variable axis at all: neither
// `font-weight: 700` nor `font-variation-settings: "wght" 700` moves it,
// while a system font bolds fine in the same run. Real Safari has supported
// variable fonts since 2017, so this reads as a harness limitation rather
// than an iOS bug, and the earlier "confirmed under real WebKit" note was
// most likely the same false positive.
//
// STILL UNVERIFIED ON A REAL IPHONE. If the h1 genuinely renders thin on a
// device, the dependable fix is self-hosting true static .woff2 files via
// next/font/local — asking next/font/google for a static weight silently
// returns the variable file again.
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "700"],
});

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

// Ce que Google affiche, et ce que les gens tapent. L'ancienne version disait
// "Lampes" alors que tout le site dit veilleuses, et ne mentionnait ni le
// paiement à la livraison ni l'Algérie — les deux choses qu'une cliente vérifie
// avant de commander en ligne ici.
export const metadata: Metadata = {
  // Les autres pages posent leur propre titre ; le gabarit leur ajoute la marque.
  title: {
    default: "Naja — veilleuses imprimées en 3D, faites main en Algérie",
    template: "%s · Naja",
  },
  description:
    "Des veilleuses imprimées en 3D à Alger, fabriquées à la commande. 7 formes, 41 coloris. Livraison dans les 58 wilayas, paiement à la livraison.",
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
