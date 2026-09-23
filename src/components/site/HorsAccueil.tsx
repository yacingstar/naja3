"use client";

import { usePathname } from "next/navigation";

// La page d'accueil a son propre en-tête et son propre pied de page, dans le
// style « série » (machine à écrire, papier beige). Les deux du site, en
// Fredoka, y feraient doublon : ce garde les retire de « / » seulement.
export function HorsAccueil({ children }: { children: React.ReactNode }) {
  return usePathname() === "/" ? null : <>{children}</>;
}
