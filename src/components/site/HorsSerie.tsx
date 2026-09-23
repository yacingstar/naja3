"use client";

import { usePathname } from "next/navigation";

// Les pages « série » (l'accueil et la boutique) ont leur propre en-tête et
// leur propre pied de page, en machine à écrire sur papier beige. Ceux du
// site, en Fredoka, y feraient doublon : ce garde les retire de ces deux
// adresses exactement. Les fiches produit (/boutique/<forme>) gardent l'en-tête
// habituel.
const PAGES_SERIE = new Set(["/", "/boutique"]);

export function HorsSerie({ children }: { children: React.ReactNode }) {
  return PAGES_SERIE.has(usePathname()) ? null : <>{children}</>;
}
