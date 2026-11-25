import { HorlogesClient } from "@/components/boutique/HorlogesClient";
import { horlogePourSlug } from "@/lib/horloges";
import { getProducts } from "@/lib/products";

// Même fenêtre de cache que la boutique : servi par le CDN, et les
// modifications de l'admin passent tout de suite par revalidatePath.
export const revalidate = 300;

export const metadata = {
  title: "Les horloges",
  description:
    "Les horloges murales Naja, imprimées en 3D à Alger et fabriquées à la commande. Composez chaque pièce dans la couleur de votre choix et tournez-la en 3D avant de commander. Livraison dans les 58 wilayas, paiement à la livraison.",
};

export default async function HorlogesPage() {
  const produits = await getProducts();
  // Le registre fait foi : une horloge est un produit qui a un modèle. Pas un
  // nom qui commence par « horloge », pas une liste écrite ici qu'il faudrait
  // penser à mettre à jour le jour où la troisième arrive.
  const horloges = produits.filter((p) => horlogePourSlug(p.slug) !== null);
  return <HorlogesClient produits={horloges} />;
}
