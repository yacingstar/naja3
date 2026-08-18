"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CartLink } from "@/components/site/CartLink";
import { InstagramIcon } from "@/components/site/Icons";
import { instagramUrl } from "@/lib/contact";

// "Comment ça marche"/FAQ are homepage sections, so they're homepage-relative
// hashes (works whether you're already on / or coming from elsewhere).
//
// Always transparent now, on every page — no more solid-on-scroll swap
// (previously `bg-papier/90 backdrop-blur` past a scroll threshold). Each
// nav item carries its own background pill instead (see the nav/cart/CTA
// classes below), so legibility no longer depends on the bar itself having
// a solid backing — same treatment works over the colorful hero, a plain
// papier page, or a product photo on the detail page.
//
// Only the wordmark reacts to scroll: it eases up and shrinks slightly
// (`scrolled` below) while the nav/cart/CTA row stays put — asked to keep
// the buttons steady and have "the company name" be the thing that moves.
// Still a CSS `transform`, never padding/font-size — changing a
// layout-affecting property here previously shrank the header's actual box
// height while scrolling, and on the homepage that fed back into
// scroll-snap-type's max-scroll calculation and permanently trapped
// scrolling partway down the page (confirmed: freezing the header's
// padding fixed it immediately). transform doesn't affect layout, so it
// avoids the whole class of bug.
//
// `fixed`, not `sticky`: with `sticky`, the header sits in normal document
// flow until scrolled, so at scroll position 0 it doesn't overlap the hero
// at all — every page compensates with `padding-top: var(--header-height)`
// in (site)/layout.tsx, and Hero.tsx cancels that specifically so it alone
// bleeds up to y=0.
const NAV_PILL =
  "rounded-full bg-papier/85 px-4 py-2 shadow-sm transition hover:bg-lueur/25";

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
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          style={{ transform: scrolled ? "translateY(-6px) scale(0.85)" : "translateY(0) scale(1)" }}
          className="origin-left font-heading text-2xl transition-transform duration-300"
        >
          Naja
        </Link>
        {/* "Découvrir" used to sit on the right as a second route to the same
            page the first nav pill already goes to. Dropping it makes room
            for the icons — but it was also the only shop entry point on a
            phone, since the rest of the nav is desktop-only. So Boutique is
            visible at every width now and the two wordier links stay
            desktop-only. */}
        <nav className="flex items-center gap-2 text-sm font-medium sm:gap-3">
          <Link href="/boutique" className={NAV_PILL}>
            Boutique
          </Link>
          <Link href="/#comment-c-est-fait" className={`hidden sm:inline-flex ${NAV_PILL}`}>
            Comment c&apos;est fait
          </Link>
          <Link href="/#faq" className={`hidden sm:inline-flex ${NAV_PILL}`}>
            FAQ
          </Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Renders only once a real handle exists in src/lib/contact.ts —
              an icon linking nowhere is worse than no icon. */}
          {instagramUrl ? (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Naja sur Instagram"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-papier/85 shadow-sm transition hover:bg-lueur/25"
            >
              <InstagramIcon className="h-5 w-5 text-encre" aria-hidden />
            </a>
          ) : null}
          <CartLink />
        </div>
      </div>
    </header>
  );
}
