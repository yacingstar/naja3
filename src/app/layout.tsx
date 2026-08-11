import type { Metadata } from "next";
import { Fredoka, Work_Sans, Caveat } from "next/font/google";
import "./globals.css";

// Headlines, product names.
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: "variable",
});

// Body text, forms, nav.
const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: "variable",
});

// Sparingly, small handwritten touches only — never body copy.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: "variable",
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
