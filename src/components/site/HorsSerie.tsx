"use client";

import { usePathname } from "next/navigation";

// Les pages « série » (l'accueil et la boutique) ont leur propre en-tête et
// leur propre pied de page, en machine à écrire sur papier beige. Ceux du
// site, en Fredoka, y feraient doublon : ce garde les retire de ces deux
// adresses exactement, ainsi que des fiches produit (/boutique/<forme>), qui
// sont passées dans le même registre.
export function HorsSerie({ children }: { children: React.ReactNode }) {
  const chemin = usePathname();
  const serie = chemin === "/" || chemin.startsWith("/boutique");
  return serie ? null : <>{children}</>;
}
