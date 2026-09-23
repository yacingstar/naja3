import type { FeaturedProduct } from "@/lib/products";
import { Galerie } from "@/components/serie/Galerie";
import { Sections } from "@/components/serie/Sections";
import { ENCRE } from "@/components/serie/style";

// La page d'accueil, refaite entière dans le style de la référence qu'elle a
// envoyée : « Illustrated Print Series — Horizontal Scroll Website » (tubik).
// Papier beige et grain, grotesque serrée, étiquettes en machine à écrire,
// affiches en risographie qui défilent à l'horizontale, frise horaire.
//
// L'ancienne page (configurateur, test, cartes à glisser) reste dans
// src/components/accueil/ : c'est le chemin de retour si ce style ne tient
// pas, et le configurateur sert toujours de modèle à la fiche produit.
//
// L'en-tête et le pied de page du site sont masqués ici (HorsSerie) : la
// page a les siens. D'où la marge négative, qui annule la place réservée à
// l'en-tête fixe par (site)/layout.tsx.
export function Serie({ produits, polices }: { produits: FeaturedProduct[]; polices: string }) {
  if (produits.length === 0) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-6">
        <p className="text-center text-lg">Les premières veilleuses arrivent très bientôt — repassez par ici.</p>
      </main>
    );
  }
  return (
    <CadreSerie polices={polices}>
      <Galerie produits={produits} />
      <Sections />
    </CadreSerie>
  );
}

// Le papier, les polices, et la marge négative qui annule la place réservée à
// l'en-tête fixe du site (masqué sur ces pages, voir HorsSerie). Partagé avec
// la boutique.
export function CadreSerie({ polices, children }: { polices: string; children: React.ReactNode }) {
  return (
    <main
      className={`${polices} papier-serie min-h-screen`}
      style={{ color: ENCRE, marginTop: "calc(-1 * var(--header-height))" }}
    >
      {children}
    </main>
  );
}
