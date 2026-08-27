import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ProductLanding } from "@/components/landing/ProductLanding";
import { formatPrice } from "@/lib/format";
import { splitProductCopy } from "@/lib/productCopy";
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
  return products.map((product) => ({ slug: product.slug }));
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
  const title = `${product.name} — ${formatPrice(product.price)} | Naja`;
  // The cutout, not a room shot: this is what shows up as the link preview
  // when someone shares the ad, and a lamp on a plain ground survives being
  // cropped to a square thumbnail.
  const image = product.colors.find((color) => color.cutoutPhotoUrl)?.cutoutPhotoUrl;

  return {
    title,
    description: lead,
    openGraph: {
      title,
      description: lead,
      type: "website",
      images: image ? [image] : undefined,
    },
  };
}

export default async function LampLandingPage({
  params,
}: PageProps<"/lampe/[slug]">) {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) notFound();

  // "Lampe nº 3" in the hero — the lamp's place in the catalogue, in the same
  // created_at order the shop lists them in, so the number a customer sees
  // here matches the order they'd meet them in on /boutique.
  const catalogue = await getProducts();
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
    />
  );
}
