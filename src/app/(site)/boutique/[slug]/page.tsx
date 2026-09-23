import { notFound } from "next/navigation";
import { Fiche } from "@/components/serie/Fiche";
import { grotesque, machine } from "@/components/serie/polices";
import { CadreSerie } from "@/components/serie/Serie";
import { getDeliveryRates } from "@/lib/deliveryRates";
import { getProductBySlug, getProducts } from "@/lib/products";

const RELATED_COUNT = 4;

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

export default async function ProductPage({
  params,
}: PageProps<"/boutique/[slug]">) {
  const { slug } = await params;
  // The order form on this page needs the wilaya list and its prices. Both
  // reads are cookie-free (see deliveryRates.ts), so the page still
  // prerenders and is served from the CDN.
  const [product, rates, tous] = await Promise.all([
    getProductBySlug(slug),
    getDeliveryRates(),
    getProducts(),
  ]);

  if (!product) notFound();

  // Le rang au catalogue donne à la fiche son numéro (№ 03) et son encre, les
  // mêmes que sur la planche de la boutique et les affiches de l'accueil.
  const index = Math.max(0, tous.findIndex((p) => p.slug === product.slug));
  const aussi = tous.filter((p) => p.slug !== product.slug).slice(0, RELATED_COUNT);

  return (
    <CadreSerie polices={`${grotesque.variable} ${machine.variable}`}>
      <Fiche
        produit={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          description: product.description,
        }}
        colors={product.colors}
        rates={rates}
        index={index}
        aussi={aussi}
      />
    </CadreSerie>
  );
}
