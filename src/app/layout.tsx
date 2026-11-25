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
const DESCRIPTION =
  "Des veilleuses et des horloges imprimées en 3D à Alger, fabriquées à la " +
  "commande, dans les couleurs que vous choisissez. Livraison dans les 58 " +
  "wilayas, paiement à la livraison.";

export const metadata: Metadata = {
  // Le domaine, dit une fois. Sans lui, toute image d'aperçu annoncée en
  // chemin relatif fait échouer le build : un aperçu de lien est lu par un
  // robot qui n'a aucune page de référence, donc « /og/naja.jpg » ne veut
  // rien dire pour lui — il lui faut l'adresse complète.
  metadataBase: new URL("https://najadz.com"),
  // Les autres pages posent leur propre titre ; le gabarit leur ajoute la marque.
  title: {
    default: "Naja — veilleuses et horloges imprimées en 3D, faites main en Algérie",
    template: "%s · Naja",
  },
  description: DESCRIPTION,
  // ── Ce qui s'affiche quand un lien du site est collé quelque part ─────────
  //
  // Jusqu'au 25 novembre 2026 le site n'en annonçait AUCUNE : un lien envoyé
  // en message privé ou posé dans une story arrivait nu, sans image et sous
  // le titre d'accueil — y compris le lien d'une horloge, qui s'annonçait
  // donc « veilleuses imprimées en 3D ». Pour une boutique dont les ventes
  // se concluent en message privé, c'était le pire endroit où être muet.
  //
  // Une page qui ne redéfinit pas `openGraph` hérite de tout ce bloc (c'est
  // la règle de Next : le champ est repris en entier, ou remplacé en entier).
  // Les pages qui parlent d'un objet précis le remplacent ; les autres
  // montrent les deux gammes, ce qui est exactement ce qu'on veut dire du
  // site lui-même.
  openGraph: {
    type: "website",
    siteName: "Naja",
    locale: "fr_FR",
    url: "/",
    title: "Naja — veilleuses et horloges imprimées en 3D",
    description: DESCRIPTION,
    images: [{ url: "/og/naja.jpg", width: 1200, height: 630 }],
  },
  // Sans ça, X et quelques applications de messagerie affichent une vignette
  // minuscule à côté du texte au lieu de l'image en grand.
  twitter: { card: "summary_large_image" },
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
