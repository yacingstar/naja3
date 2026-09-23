import { BoutiqueClient } from "@/components/boutique/BoutiqueClient";
import { getProducts } from "@/lib/products";

// See the note on the homepage: CDN-served, with admin edits pushing through
// immediately via revalidatePath and this window as the backstop.
export const revalidate = 300;

export const metadata = {
  title: "Toutes les veilleuses",
  description:
    "Les veilleuses Naja, imprimées en 3D à Alger et fabriquées à la commande. Choisissez la forme et le coloris. Livraison dans les 58 wilayas, paiement à la livraison.",
};

export default async function BoutiquePage() {
  const produits = await getProducts();
  return <BoutiqueClient produits={produits} />;
}
