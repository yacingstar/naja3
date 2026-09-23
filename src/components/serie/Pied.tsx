import Link from "next/link";
import { CONTACT_LINKS } from "@/lib/contact";
import { ENCRE, M } from "@/components/serie/style";

// Le pied de page des pages « série », sur une seule ligne en machine à
// écrire comme celui de la référence.
export function Pied() {
  return (
    <footer
      className={`${M} mx-5 mt-20 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-t pt-5 pb-8 text-[10px] opacity-80 sm:mx-10 sm:text-[11px]`}
      style={{ borderColor: `${ENCRE}33` }}
    >
      <span>© {new Date().getFullYear()} Naja · veilleuses imprimées en 3D</span>
      <span className="flex flex-wrap gap-5">
        <Link href="/" className="underline underline-offset-4">Série</Link>
        <Link href="/boutique" className="underline underline-offset-4">Boutique</Link>
        {CONTACT_LINKS.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="underline underline-offset-4">
            {l.label}
          </a>
        ))}
      </span>
      <span>Fait à Alger, surtout le soir</span>
    </footer>
  );
}
