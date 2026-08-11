import Link from "next/link";
import { ProductCard } from "@/components/site/ProductCard";
import { Reveal } from "@/components/site/Reveal";
import { getFeaturedProducts } from "@/lib/products";

export async function CatalogPreview() {
  const products = await getFeaturedProducts();

  return (
    <section id="creations" className="snap-section mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <h2 className="text-center font-heading text-3xl">Nos créations</h2>
      </Reveal>

      {products.length === 0 ? (
        <p className="mx-auto mt-8 max-w-md text-center text-encre/70">
          Les premières lampes arrivent très bientôt — repassez par ici.
        </p>
      ) : (
        <>
          <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
          <p className="mt-12 text-center">
            <Link href="/boutique" className="text-sm font-medium hover:text-lueur">
              Voir toute la collection →
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
