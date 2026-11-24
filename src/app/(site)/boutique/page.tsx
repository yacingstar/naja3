import { BoutiqueClient } from "@/components/boutique/BoutiqueClient";
import { getProducts } from "@/lib/products";

// See the note on the homepage: CDN-served, with admin edits pushing through
// immediately via revalidatePath and this window as the backstop.
export const revalidate = 300;

// « Toute la collection » et non « Toutes les veilleuses » : la boutique
// vend aussi des horloges depuis novembre 2026, et un titre qui ne parle que
// de veilleuses ferait passer la nouveauté pour une erreur de rangement.
export const metadata = {
  title: "Toute la collection",
  description:
    "Les veilleuses et les horloges Naja, imprimées en 3D à Alger et fabriquées à la commande. Choisissez la forme et les couleurs. Livraison dans les 58 wilayas, paiement à la livraison.",
};

export default async function BoutiquePage() {
  const produits = await getProducts();
  return <BoutiqueClient produits={produits} />;
}
