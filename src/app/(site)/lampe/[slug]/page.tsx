import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { ProductLanding } from "@/components/landing/ProductLanding";
import { getDeliveryRates } from "@/lib/deliveryRates";
import { formatPrice } from "@/lib/format";
import { cartePartage } from "@/lib/cartesPartage";
import { splitProductCopy } from "@/lib/productCopy";
import { horlogePourSlug } from "@/lib/horloges";
import { getProductBySlug, getProducts } from "@/lib/products";

// Same caching posture as /boutique/[slug], and for a sharper version of the
// same reason: this is the page an Instagram ad drops a cold visitor onto, so
// a per-request function call is the worst possible first byte.
export const revalidate = 300;

// Without this the route stays dynamic however low `revalidate` is: Next
// can't prerender a dynamic segment whose values it doesn't know.
// `dynamicParams` keeps its default of true, so a lamp added in the admin
// gets its landing page on first request rather than 404ing until the next
// deploy.
export async function generateStaticParams() {
  const products = await getProducts();
  // Pas de page de pub pour une horloge — voir le renvoi plus bas. Inutile
  // d'en préparer une qui ne fera que rediriger.
  return products
    .filter((product) => horlogePourSlug(product.slug) === null)
    .map((product) => ({ slug: product.slug }));
}

// The page body and generateMetadata both need the same product, and Next
// calls them separately. React's per-request cache collapses that back into
// one query instead of two.
const loadProduct = cache(getProductBySlug);

export async function generateMetadata({
  params,
}: PageProps<"/lampe/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return {};

  const { lead } = splitProductCopy(product.description);
  // Le gabarit du layout racine ajoute déjà « · Naja ». Ce titre finissait
  // donc par « Ondine — 3 500 DA | Naja · Naja » dans l'onglet et dans tous
  // les aperçus de lien — vérifié en ligne le 25 novembre 2026.
  const title = `${product.name} — ${formatPrice(product.price)}`;
  // La carte préparée, et plus la découpe du catalogue.
  //
  // Celle-ci était un .webp sur fond TRANSPARENT : deux façons de mal finir.
  // Le format d'abord — les aperçus de lien ne s'entendent pas sur le .webp,
  // et on trouve des cas d'images refusées. Le fond ensuite : faute de savoir
  // quoi faire de la transparence, un aperçu compose sur du noir, et la
  // veilleuse ivoire devenait une tache sombre. Voir scripts/cartes-partage.mjs.
  const image = cartePartage(product.slug);

  return {
    title,
    description: lead,
    openGraph: {
      type: "website",
      siteName: "Naja",
      locale: "fr_FR",
      url: `/lampe/${product.slug}`,
      title,
      description: lead,
      images: [{ url: image, width: 1200, height: 630 }],
    },
  };
}

export default async function LampLandingPage({
  params,
}: PageProps<"/lampe/[slug]">) {
  const { slug } = await params;
  // Both reads are cookie-free (see deliveryRates.ts), so the page still
  // prerenders — which matters most here, of all places: this is where a cold
  // ad click lands.
  const [product, rates] = await Promise.all([loadProduct(slug), getDeliveryRates()]);

  if (!product) notFound();

  // Une horloge n'a pas de page de pub, et ce n'est pas un oubli : cette page
  // vend UN objet dans UN coloris, avec un bon de commande qui ne demande
  // aucune couleur de pièce. Sur une horloge, elle affichait donc un
  // formulaire qu'on pouvait remplir en entier et que la Server Action
  // refusait à l'envoi — elle exige une bobine nommée pour chacune des
  // pièces. La cliente tapait son adresse pour recevoir une erreur.
  //
  // Le renvoi vers la fiche garde les liens déjà partagés vivants. Le jour où
  // la patronne voudra vraiment faire de la pub pour une horloge, il faudra
  // un configurateur sur cette page-là, pas un formulaire aveugle.
  if (horlogePourSlug(product.slug)) redirect(`/boutique/${product.slug}`);

  // "Lampe nº 3" in the hero — the lamp's place in the catalogue, in the same
  // created_at order the shop lists them in, so the number a customer sees
  // here matches the order they'd meet them in on /boutique.
  // Les veilleuses seules : « Lampe nº 3 » compte des lampes, et l'horloge
  // arrivée en tête du catalogue décalerait le numéro de toutes les pages de
  // pub d'un cran sans que personne ne s'en aperçoive.
  const catalogue = (await getProducts()).filter((item) => !item.preview);
  const position = catalogue.findIndex((item) => item.slug === product.slug);

  const { lead, room } = splitProductCopy(product.description);

  return (
    <ProductLanding
      product={{
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        // findIndex returns -1 for a lamp published since the last
        // getProducts() cache fill; falling back to 1 keeps the hero's
        // eyebrow sane rather than printing "Lampe nº 0".
        number: position >= 0 ? position + 1 : 1,
        lead,
        roomCopy: room,
      }}
      colors={product.colors}
      rates={rates}
    />
  );
}
