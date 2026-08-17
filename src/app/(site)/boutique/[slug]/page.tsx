import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/site/ProductCard";
import { ProductDetail } from "@/components/site/ProductDetail";
import { Reveal } from "@/components/site/Reveal";
import { getProductBySlug, getProducts } from "@/lib/products";

const RELATED_COUNT = 3;

export default async function ProductPage({
  params,
}: PageProps<"/boutique/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  // "Vous aimerez aussi" — the page used to end at the description, which
  // left a dead end on the one page most likely to be someone's entry
  // point from a shared link. Anything but this product, capped at three
  // so the row stays a suggestion rather than a second catalogue.
  const related = (await getProducts())
    .filter((p) => p.slug !== product.slug)
    .slice(0, RELATED_COUNT);

  return (
    <main className="pb-24">
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
        />
      </div>

      {related.length > 0 ? (
        <section className="mx-auto mt-24 max-w-6xl px-6">
          <Reveal>
            <h2 className="text-center font-heading text-3xl">Vous aimerez aussi</h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item, index) => (
              <ProductCard key={item.id} product={item} index={index} />
            ))}
          </div>
          <p className="mt-14 text-center">
            <Link href="/boutique" className="text-sm font-medium hover:text-lueur">
              Voir toute la collection →
            </Link>
          </p>
        </section>
      ) : null}
    </main>
  );
}
