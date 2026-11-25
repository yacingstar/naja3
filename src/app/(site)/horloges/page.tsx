import type { Metadata } from "next";
import { cache } from "react";
import { HorlogesClient } from "@/components/boutique/HorlogesClient";
import { cartePartage } from "@/lib/cartesPartage";
import { horlogePourSlug } from "@/lib/horloges";
import { getProducts } from "@/lib/products";

// Même fenêtre de cache que la boutique : servi par le CDN, et les
// modifications de l'admin passent tout de suite par revalidatePath.
export const revalidate = 300;

const TITRE = "Les horloges";
const DESCRIPTION =
  "Les horloges murales Naja, imprimées en 3D à Alger et fabriquées à la commande. Composez chaque pièce dans la couleur de votre choix et tournez-la en 3D avant de commander. Livraison dans les 58 wilayas, paiement à la livraison.";

// Le catalogue est lu deux fois sur cette page — ici et dans le corps — parce
// que Next appelle les deux séparément. Le cache de requête de React les
// ramène à une seule lecture.
const chargerProduits = cache(getProducts);

// L'aperçu de lien montre une horloge, pas les deux gammes.
//
// C'est le lien de la nouveauté : celui qui part en story et en message
// privé. L'image est celle de la PREMIÈRE horloge du catalogue, trouvée par
// la même règle que le corps de la page — pas un slug écrit en dur, qui
// mentirait le jour où la deuxième horloge arrive ou où celle-ci est retirée.
export async function generateMetadata(): Promise<Metadata> {
  const horloge = (await chargerProduits()).find(
    (p) => horlogePourSlug(p.slug) !== null,
  );

  return {
    title: TITRE,
    description: DESCRIPTION,
    alternates: { canonical: "/horloges" },
    openGraph: {
      type: "website",
      siteName: "Naja",
      locale: "fr_FR",
      url: "/horloges",
      title: "Les horloges Naja",
      description: DESCRIPTION,
      images: [
        {
          url: horloge ? cartePartage(horloge.slug) : "/og/naja.jpg",
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function HorlogesPage() {
  const produits = await chargerProduits();
  // Le registre fait foi : une horloge est un produit qui a un modèle. Pas un
  // nom qui commence par « horloge », pas une liste écrite ici qu'il faudrait
  // penser à mettre à jour le jour où la troisième arrive.
  const horloges = produits.filter((p) => horlogePourSlug(p.slug) !== null);
  return <HorlogesClient produits={horloges} />;
}
