import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CarteProduit } from "@/components/boutique/CarteProduit";
import { FondDoux } from "@/components/accueil/FondDoux";
import { ProductDetail } from "@/components/site/ProductDetail";
import { cartePartage } from "@/lib/cartesPartage";
import { getDeliveryRates } from "@/lib/deliveryRates";
import { formatPrice } from "@/lib/format";
import { horlogePourSlug } from "@/lib/horloges";
import { splitProductCopy } from "@/lib/productCopy";
import {
  getFilamentColors,
  getProductBySlug,
  getProductCustomisation,
  getProducts,
} from "@/lib/products";

const RELATED_COUNT = 3;

// See the note on the homepage. This is the page Instagram ads will deep-link
// to, so it's the one where a cold-start first byte would cost the most.
export const revalidate = 300;

// Without this the route stays dynamic however low `revalidate` is set:
// Next can't prerender a dynamic segment whose values it doesn't know, so
// every product page would still be a per-request function call. Listing the
// slugs at build time lets all of them be prerendered and CDN-served.
//
// `dynamicParams` stays at its default of true, so a product added after the
// build still renders on first request and is cached from then on — adding a
// lamp in the admin never 404s while waiting for a deploy.
export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

// Le corps de la page et generateMetadata ont besoin du même produit, et Next
// les appelle séparément. Le cache de requête de React ramène ça à une seule
// lecture — même raison qu'à côté, dans /lampe/[slug].
const chargerProduit = cache(getProductBySlug);

// Ce qui s'affiche quand quelqu'un colle le lien de cette fiche dans un
// message privé, une story ou une conversation WhatsApp.
//
// C'est LA page qui se partage : la patronne vend en message privé, et c'est
// cette adresse qu'elle envoie. Elle arrivait jusqu'ici sans image et sous le
// titre d'accueil du site — « Naja — veilleuses imprimées en 3D » posé sur le
// lien d'une horloge. Pour un objet à 4 500 DA annoncé par un lien nu, le
// doute est gratuit et il coûte la vente.
export async function generateMetadata({
  params,
}: PageProps<"/boutique/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await chargerProduit(slug);
  // Pas de produit : pas de balises inventées. La page rendra son 404.
  if (!product) return {};

  const horloge = horlogePourSlug(product.slug);
  // Le gabarit du layout ajoute « · Naja » derrière : ne pas le remettre ici.
  const titre = `${product.name} — ${formatPrice(product.price)}`;
  // Les deux premières phrases de la description écrite dans l'admin, les
  // mêmes que la page de pub utilise pour son chapeau. La patronne écrit donc
  // son aperçu de lien sans le savoir, en écrivant sa fiche.
  const { lead } = splitProductCopy(product.description);
  const description = horloge
    ? `${lead} ${horloge.zones.length} pièces dont vous choisissez la couleur. Livraison dans les 58 wilayas, paiement à la livraison.`
    : `${lead} Livraison dans les 58 wilayas, paiement à la livraison.`;

  return {
    title: titre,
    description,
    alternates: { canonical: `/boutique/${product.slug}` },
    openGraph: {
      type: "website",
      siteName: "Naja",
      locale: "fr_FR",
      url: `/boutique/${product.slug}`,
      title: titre,
      description,
      images: [{ url: cartePartage(product.slug), width: 1200, height: 630 }],
    },
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/boutique/[slug]">) {
  const { slug } = await params;
  // The order form on this page needs the wilaya list and its prices. Both
  // reads are cookie-free (see deliveryRates.ts), so the page still
  // prerenders and is served from the CDN.
  const [product, rates] = await Promise.all([
    chargerProduit(slug),
    getDeliveryRates(),
  ]);

  if (!product) notFound();

  // Les pièces du produit et la palette des bobines, lues à part : un produit
  // normal n'en a pas, et ces deux lectures ne doivent pas pouvoir faire
  // tomber une fiche de veilleuse — voir le commentaire dans lib/products.ts.
  const customisation = await getProductCustomisation(product.id);
  const palette = customisation ? await getFilamentColors() : [];

  // "Vous aimerez aussi" — the page used to end at the description, which
  // left a dead end on the one page most likely to be someone's entry
  // point from a shared link. Anything but this product, capped at three
  // so the row stays a suggestion rather than a second catalogue.
  const related = (await getProducts())
    .filter((p) => p.slug !== product.slug)
    .slice(0, RELATED_COUNT);

  return (
    <main className="relative pb-24">
      {/* Le même lavis diffus que l'accueil et la boutique, pour que la page
          d'achat ne soit pas la seule à être posée sur du blanc. */}
      <FondDoux teinte="rgba(246,198,206,.20)" nuit={false} />

      <div className="mx-auto max-w-6xl px-6 pt-16">
        <ProductDetail
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            price: product.price,
            description: product.description,
          }}
          colors={product.colors}
          customisation={customisation}
          palette={palette}
          rates={rates}
        />
      </div>

      {related.length > 0 ? (
        <section className="mx-auto mt-24 max-w-6xl px-6">
          <h2 className="font-heading text-[36px] leading-none font-bold tracking-[-.03em] sm:text-[48px]">
            Vous aimerez aussi.
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item, index) => (
              <CarteProduit key={item.id} produit={item} index={index} />
            ))}
          </div>
          <p className="mt-10">
            <Link
              href="/boutique"
              className="inline-block rounded-full bg-encre px-7 py-3.5 font-heading text-base text-papier shadow-[0_8px_0_-1px_rgba(36,28,33,.35)] transition active:translate-y-1 active:shadow-none"
            >
              Voir toute la collection
            </Link>
          </p>
        </section>
      ) : null}
    </main>
  );
}
