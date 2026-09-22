import Link from "next/link";
// Contact destinations moved to src/lib/contact.ts — the header wants the
// Instagram handle too, and two copies of that config would drift.
import { CONTACT_LINKS } from "@/lib/contact";
import { LampMark } from "@/components/LampMark";

// Redrawn in the register of the new homepage: heavy Fredoka, thick encre
// outlines, flat colour blocks. It is shared by every page, so the site now
// closes the same way everywhere even while the rest of it is still being
// moved over.
//
// The row of lamps that used to hang from the top edge is kept, but drawn with
// LampMark — the same mark as the swatches in the admin, on the product pages
// and in the homepage configurator. One lamp, drawn once, everywhere.
const LAMPES = [
  { hex: "#ff5d8f", hex2: null },
  { hex: "#ffc233", hex2: null },
  { hex: "#0290e9", hex2: "#ffffff" },
  { hex: "#5cbf7d", hex2: null },
  { hex: "#ff6b3d", hex2: null },
];

function Colonne({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-heading text-[19px] font-semibold text-encre">{titre}</p>
      <ul className="mt-3 space-y-2 text-[15px] font-medium">{children}</ul>
    </div>
  );
}

function Lien({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="inline-block text-encre/75 transition hover:translate-x-0.5 hover:text-encre"
      >
        {children}
      </Link>
    </li>
  );
}

export function Footer() {
  return (
    <footer className="snap-section mt-auto px-5 pb-6 sm:px-12">
      {/* snap-section is inert everywhere scroll-snap-type isn't set on an
          ancestor (i.e. every page except the old homepage) — see
          ScrollSnapHomepage.tsx. */}
      <div className="relative rounded-[2.75rem] border-4 border-encre bg-blush/35 px-6 pt-16 pb-8 sm:px-10">
        {/* The lamps hang from the top edge, inside the padded box so they can
            never be clipped by the rounded corner. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex justify-center gap-8 sm:gap-14">
          {LAMPES.map((l, i) => (
            <span key={i} className="flex flex-col items-center">
              <span className="w-px bg-encre/30" style={{ height: 14 + (i % 3) * 12 }} />
              <LampMark hex={l.hex} hex2={l.hex2} className="h-8 w-8" />
            </span>
          ))}
        </div>

        <div className="mx-auto max-w-6xl pt-10">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-10">
            {/* Brand block — spans both mobile columns so the tagline isn't
                squeezed into a half-width column on a phone. */}
            <div className="col-span-2 sm:col-span-1">
              <p className="font-heading text-[42px] leading-none font-bold tracking-[-.02em] text-encre">
                naja
              </p>
              <p className="mt-1 font-hand text-xl text-crepuscule">fait main, avec soin</p>
              <p className="mt-3 max-w-xs text-[15px] leading-snug font-medium text-encre/75">
                Des veilleuses imprimées en 3D, fabriquées à la commande en Algérie.
              </p>
            </div>

            {/* No "Mon panier" here any more: orders are placed on the product
                page itself (see DirectOrderForm), so the basket is never
                filled and that link led to a permanently empty page. */}
            <Colonne titre="La boutique">
              <Lien href="/boutique">Toutes les veilleuses</Lien>
              <Lien href="/">Composer la mienne</Lien>
            </Colonne>

            <Colonne titre="Aide">
              <Lien href="/#comment">Comment ça se passe</Lien>
              <Lien href="/boutique">Les coloris</Lien>
            </Colonne>

            <Colonne titre="Nous écrire">
              {CONTACT_LINKS.length > 0 ? (
                CONTACT_LINKS.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-encre/75 transition hover:translate-x-0.5 hover:text-encre"
                    >
                      {link.label}
                    </a>
                  </li>
                ))
              ) : (
                // Nothing wired up yet — see CONTACT in src/lib/contact.ts.
                <li className="text-encre/75">Une question ? Écrivez-nous</li>
              )}
            </Colonne>
          </div>

          <p className="mt-10 rounded-full bg-encre px-6 py-3.5 text-center font-heading text-[15px] text-papier sm:text-base">
            Payez à la livraison · 58 wilayas · aucun acompte
          </p>

          <div className="mt-6 flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-xs font-medium text-encre/55">
              © {new Date().getFullYear()} Naja. Tous droits réservés.
            </p>
            <p className="font-hand text-lg text-encre/70">
              fait avec{" "}
              <span aria-hidden className="text-lueur">
                ♥
              </span>
              <span className="sr-only">amour</span> en Algérie
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
