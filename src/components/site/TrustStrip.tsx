import type { SVGProps } from "react";
import { Reveal } from "@/components/site/Reveal";

// Hand-rolled, not lucide-react (not a project dependency yet, and four
// icons doesn't justify adding one). Same visual grammar throughout so
// they read as a set: 24x24, 1.5 stroke, round caps/joins, no fill except
// the tiny question-mark dot — deliberately plainer than lucide's default
// so nothing here competes with the illustrations elsewhere on the page.
function CashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.25" />
      <path d="M6 9.5h.01M18 14.5h.01" />
    </svg>
  );
}

function TruckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 8h11v8H2z" />
      <path d="M13 11h3.5L20 14.2V16h-7z" />
      <circle cx="6.5" cy="18" r="1.6" />
      <circle cx="16.5" cy="18" r="1.6" />
    </svg>
  );
}

function HeartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20s-7-4.35-9.5-9C1 7.5 2.5 4 6 4c2 0 3.5 1.2 4 2.5.5-1.3 2-2.5 4-2.5 3.5 0 5 3.5 3.5 7-2.5 4.65-9.5 9-9.5 9z" />
    </svg>
  );
}

function ChatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 4.75h16v10.5H8.75L4 19.5z" />
      <path d="M9.6 9.3a2.15 2.15 0 1 1 3.2 1.87c-.68.4-1.3.86-1.3 1.63" />
      <circle cx="12" cy="15.1" r="0.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

const ITEMS = [
  { Icon: CashIcon, text: "Paiement à la livraison" },
  { Icon: TruckIcon, text: "Livraison dans toute l'Algérie" },
  { Icon: HeartIcon, text: "Fait main en Algérie", hand: true },
  // No WhatsApp number / contact link wired up anywhere in the project yet
  // (checked Footer.tsx and everywhere else) — stays plain text per the
  // brief until there's a real number or address to point at.
  { Icon: ChatIcon, text: "Une question ? Écrivez-nous" },
];

// Sits in the plain --papier gap between Hero's rounded-bottom close and
// the catalogue — a quiet reassurance aside, not a features section. Went
// with a contained rounded band (bg-blush/20) rather than a full-bleed
// colored bar: the site's rounded-corner motif already speaks for itself
// (Hero's bottom, CraftSteps' whole section), so a soft pill sitting *in*
// the page width continues that language instead of adding a heavier,
// more "conversion bar" full-width stripe.
export function TrustStrip() {
  return (
    <section className="px-6 py-10 sm:py-8">
      <Reveal>
        <div className="mx-auto max-w-5xl rounded-[1.75rem] bg-blush/20 px-6 py-6 sm:rounded-full sm:px-8 sm:py-5">
          <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:flex sm:grid-cols-none sm:items-stretch sm:justify-between sm:gap-0 sm:divide-x sm:divide-blush">
            {ITEMS.map((item) => (
              <li
                key={item.text}
                className="flex flex-col items-center gap-2 text-center sm:flex-1 sm:flex-row sm:justify-center sm:gap-2.5 sm:px-4"
              >
                <item.Icon className="h-5 w-5 shrink-0 text-encre" aria-hidden />
                <span
                  className={
                    item.hand
                      ? "font-hand text-base text-encre sm:whitespace-nowrap"
                      : "text-sm text-encre sm:whitespace-nowrap"
                  }
                >
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
