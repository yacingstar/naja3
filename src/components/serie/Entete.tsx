import Link from "next/link";
import { G, M, ROUGE } from "@/components/serie/style";

// L'en-tête des pages « série » (accueil, boutique) : le nom en capitales
// avec son point rouge, une navigation en machine à écrire, et à droite ce
// que la page veut y mettre — l'horloge sur l'accueil, le compte des formes
// dans la boutique.
//
// Les liens vers les sections de l'accueil sont écrits « /#… » et non « #… »,
// pour marcher aussi depuis la boutique.
const LIENS = [
  { href: "/", label: "Série", page: "accueil" },
  { href: "/boutique", label: "Boutique", page: "boutique" },
  { href: "/#procede", label: "Procédé", page: null },
  { href: "/#questions", label: "Questions", page: null },
] as const;

export function Entete({
  courant,
  droite,
}: {
  // « produit » : la fiche porte l'en-tête sans qu'aucun onglet ne soit
  // souligné — on n'est ni sur la série ni sur la planche.
  courant: "accueil" | "boutique" | "produit";
  droite?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-4 px-5 pt-5 sm:px-10 lg:pt-6">
      <Link href="/" className={`${G} flex items-center gap-1.5 text-[17px] font-bold tracking-[-.01em] uppercase`}>
        Naja
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: ROUGE }} />
      </Link>
      <nav className={`${M} hidden items-center gap-7 text-[11px] tracking-[.12em] uppercase md:flex`}>
        {LIENS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={l.page === courant ? "page" : undefined}
            className={`transition hover:opacity-60 ${l.page === courant ? "underline decoration-2 underline-offset-[6px]" : ""}`}
            style={l.page === courant ? { textDecorationColor: ROUGE } : undefined}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className={`${M} flex min-w-0 items-center gap-2 text-[12px] sm:text-[13px]`}>
        {droite}
        {/* Sur téléphone la navigation est cachée : on garde le lien qui
            mène ailleurs que la page courante. */}
        <Link
          href={courant === "accueil" ? "/boutique" : "/"}
          className="ml-2 tracking-[.12em] uppercase underline underline-offset-4 md:hidden"
        >
          {courant === "accueil" ? "Boutique" : "Série"}
        </Link>
      </div>
    </header>
  );
}
