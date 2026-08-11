"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CartLink } from "@/components/site/CartLink";

// "Comment ça marche"/FAQ are homepage sections, so they're homepage-relative
// hashes (works whether you're already on / or coming from elsewhere).
//
// The shrink-on-scroll effect uses a CSS transform (scale), never
// padding/font-size. Changing a layout-affecting property here shrank the
// header's actual box height while scrolling, and on the homepage that fed
// back into scroll-snap-type's max-scroll calculation and permanently
// trapped scrolling partway down the page (confirmed: freezing the
// header's padding fixed it immediately). transform doesn't affect layout,
// so scaling avoids the whole class of bug.
export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    function handleScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 16);
        ticking = false;
      });
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-encre/10 bg-papier/90 backdrop-blur">
      <div
        style={{ transform: scrolled ? "scale(0.92)" : "scale(1)" }}
        className="mx-auto flex max-w-6xl origin-top items-center justify-between px-6 py-4 transition-transform duration-300"
      >
        <Link href="/" className="font-heading text-2xl">
          Naja
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium sm:flex">
          <Link href="/boutique" className="hover:text-lueur">
            Boutique
          </Link>
          <Link href="/#comment-ca-marche" className="hover:text-lueur">
            Comment ça marche
          </Link>
          <Link href="/#faq" className="hover:text-lueur">
            FAQ
          </Link>
        </nav>
        <div className="flex items-center gap-6">
          <CartLink />
          <Link
            href="/boutique"
            className="rounded-full bg-lueur px-5 py-2 text-sm font-medium text-encre transition hover:bg-lueur/90"
          >
            Découvrir
          </Link>
        </div>
      </div>
    </header>
  );
}
