"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// L'ancienne barre était quatre liens en petit gris, sans indication de
// l'endroit où l'on se trouve. Ici l'onglet courant est plein, les autres sont
// cerclés : on sait toujours sur quelle page on est, y compris sur un
// téléphone où la barre passe à la ligne.
const ONGLETS = [
  { href: "/admin", label: "Accueil" },
  { href: "/admin/commandes", label: "Commandes" },
  { href: "/admin/produits", label: "Produits" },
  { href: "/admin/livraison", label: "Livraison" },
];

export function AdminNav({ className = "" }: { className?: string }) {
  const chemin = usePathname();

  return (
    <nav className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {ONGLETS.map((o) => {
        // « Accueil » ne doit s'allumer que sur /admin exactement, sinon il
        // reste allumé sur toutes les sous-pages.
        const actif = o.href === "/admin" ? chemin === "/admin" : chemin.startsWith(o.href);
        return (
          <Link
            key={o.href}
            href={o.href}
            aria-current={actif ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              actif
                ? "bg-encre text-papier"
                : "border-2 border-encre/15 text-encre/70 hover:border-encre/40 hover:text-encre"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
