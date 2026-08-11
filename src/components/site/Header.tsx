import Link from "next/link";
import { CartLink } from "@/components/site/CartLink";

// Shrink-on-scroll behavior lands in Phase 6 — this is the static version.
// "Comment ça marche"/FAQ are homepage sections, so they're homepage-relative
// hashes (works whether you're already on / or coming from elsewhere).
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-encre/10 bg-papier/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
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
