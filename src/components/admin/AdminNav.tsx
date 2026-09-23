"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { M, ROUGE } from "@/components/serie/style";

// Les onglets de l'admin, dans la langue de la série : machine à écrire, en
// capitales espacées, et l'onglet courant souligné de rouge. Pas de pastille
// pleine — un outil se lit, il ne se décore pas.
const ONGLETS = [
  { href: "/admin", label: "Accueil" },
  { href: "/admin/commandes", label: "Commandes" },
  { href: "/admin/produits", label: "Produits" },
  { href: "/admin/livraison", label: "Livraison" },
];

export function AdminNav({ className = "" }: { className?: string }) {
  const chemin = usePathname();

  return (
    <nav className={`${M} flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] tracking-[.12em] uppercase ${className}`}>
      {ONGLETS.map((o) => {
        // « Accueil » ne doit s'allumer que sur /admin exactement, sinon il
        // reste allumé sur toutes les sous-pages.
        const actif = o.href === "/admin" ? chemin === "/admin" : chemin.startsWith(o.href);
        return (
          <Link
            key={o.href}
            href={o.href}
            aria-current={actif ? "page" : undefined}
            className={`transition hover:opacity-60 ${actif ? "underline decoration-2 underline-offset-[6px]" : "opacity-70"}`}
            style={actif ? { textDecorationColor: ROUGE } : undefined}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
