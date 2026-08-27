import { Archivo } from "next/font/google";
import { MetaPixel } from "@/components/site/MetaPixel";
import { CartProvider } from "@/lib/cart";
import "./landing.css";

// Its own route group on purpose, a sibling of (site) rather than a page
// inside it. These pages carry their own nav and their own footer as part of
// the poster composition — dropping them under the storefront layout would
// stack the shop's fixed header on top of that, and the shop's soft blush
// footer under it.
//
// What they do keep from (site) is the cart and the pixel. Cart state lives
// in localStorage under one key (see lib/cart.tsx), so a second provider
// here is not a second cart: add a lamp on a landing page, click through to
// /panier, and the storefront's provider reads back exactly what this one
// wrote.

// Archivo is declared here rather than in the root layout so the font is
// only ever requested on these routes. The storefront's Fredoka/Work Sans/
// Caveat set stays untouched, and a shopper who never sees a landing page
// never downloads this.
//
// 400 body, 600 nothing-yet, 800 every heading and button — the Modernist
// system's headings are all one weight.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "800"],
});

export default function LandingLayout({ children }: LayoutProps<"/lampe">) {
  return (
    <CartProvider>
      <MetaPixel />
      <div className={`${archivo.variable} flex flex-1 flex-col`}>{children}</div>
    </CartProvider>
  );
}
