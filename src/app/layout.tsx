import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Placeholder fonts — replaced with Fredoka / Work Sans / Caveat in Phase 2.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
