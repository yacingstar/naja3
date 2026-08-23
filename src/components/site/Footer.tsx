import Link from "next/link";
// Contact destinations moved to src/lib/contact.ts — the header wants the
// Instagram handle too, and two copies of that config would drift.
import { CONTACT_LINKS } from "@/lib/contact";

// Tiny lamps hung from the footer's top edge — the hero's signature device
// at a much smaller scale, so the page closes with a callback to how it
// opened. Static on purpose (the hero's row is the one that swings; a
// second animated rail down here would just be noise), which also means
// there's nothing for prefers-reduced-motion to switch off.
function MiniLamp({ cord, width }: { cord: string; width: string }) {
  return (
    <span aria-hidden className="flex flex-col items-center" style={{ width }}>
      <span className="w-px bg-encre/25" style={{ height: cord }} />
      <span className="relative">
        <svg viewBox="0 0 60 46" className="relative block h-auto w-full" style={{ width }}>
          <path
            d="M30,3 C20,3 12,22 9,34 A 30,9 0 0 0 51,34 C48,22 40,3 30,3 Z"
            fill="var(--lueur)"
            stroke="var(--encre)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <ellipse cx="30" cy="35.5" rx="9" ry="3" fill="var(--papier)" opacity="0.8" />
        </svg>
      </span>
    </span>
  );
}

const FOOTER_LAMPS = [
  { cord: "22px", width: "26px" },
  { cord: "40px", width: "20px" },
  { cord: "14px", width: "31px" },
  { cord: "34px", width: "23px" },
];

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-heading text-sm tracking-wide text-encre/55 uppercase">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        // inline-block so the nudge actually applies (transforms don't
        // affect inline boxes)
        className="inline-block text-encre/75 transition hover:translate-x-0.5 hover:text-encre"
      >
        {children}
      </Link>
    </li>
  );
}

export function Footer() {
  return (
    <footer className="snap-section mt-auto">
      {/* snap-section is inert everywhere scroll-snap-type isn't set on an
          ancestor (i.e. every page except the homepage) — see
          ScrollSnapHomepage.tsx. On the homepage, without this the last
          snap point (FAQ) sits just short of the true page end, and
          proximity-snap scrolling gets stuck there, unable to reach the
          footer at all (confirmed while testing). Making the footer itself
          the final snap point means the last stop actually is the end. */}
      <div className="relative rounded-t-[clamp(2rem,6vw,4rem)] bg-blush/25 px-6 pt-14 pb-8">
        {/* The mini lamp rail sits ON the rounded top edge, hanging down
            into the footer. Centered and clipped-safe: it's inside the
            padded container, not absolutely positioned above it. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center gap-10 sm:gap-16">
          {FOOTER_LAMPS.map((lamp, index) => (
            <MiniLamp key={index} cord={lamp.cord} width={lamp.width} />
          ))}
        </div>

        <div className="mx-auto max-w-6xl pt-12">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-10">
            {/* Brand block — spans both mobile columns so the tagline
                isn't squeezed into a half-width column on a phone. */}
            <div className="col-span-2 sm:col-span-1">
              <p className="font-heading text-2xl">Naja</p>
              <p className="mt-1 font-hand text-lg text-crepuscule">
                fait main, avec soin
              </p>
              <p className="mt-3 max-w-xs text-sm leading-snug text-encre/70">
                Des lampes imprimées en 3D, fabriquées à la commande en Algérie.
              </p>
            </div>

            <FooterColumn title="La boutique">
              <FooterLink href="/boutique">Toutes les lampes</FooterLink>
              <FooterLink href="/panier">Mon panier</FooterLink>
            </FooterColumn>

            <FooterColumn title="Aide">
              <FooterLink href="/#faq">Questions fréquentes</FooterLink>
              <FooterLink href="/#comment-c-est-fait">Comment c&apos;est fait</FooterLink>
            </FooterColumn>

            <FooterColumn title="Nous écrire">
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
            </FooterColumn>
          </div>

          {/* Hand-drawn-ish rule: a dotted line rather than a hard border,
              to stay in the same register as the Caveat accents. */}
          <div className="mt-10 border-t border-dashed border-encre/15 pt-6">
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
              <p className="text-xs text-encre/50">
                © {new Date().getFullYear()} Naja. Tous droits réservés.
              </p>
              <p className="font-hand text-base text-encre/70">
                fait avec{" "}
                <span aria-hidden className="text-lueur">
                  ♥
                </span>
                <span className="sr-only">amour</span> en Algérie
              </p>
              <p className="text-xs text-encre/50">
                Paiement à la livraison · 58 wilayas
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
