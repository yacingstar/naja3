import Link from "next/link";
import { ProductCarousel } from "@/components/site/ProductCarousel";
import { Reveal } from "@/components/site/Reveal";
import { getProducts } from "@/lib/products";

export async function CatalogPreview() {
  // Every product, not a capped "featured" slice: this is a horizontal
  // carousel, so more products cost scroll length rather than page height,
  // and a newly-added lamp silently missing from the homepage (which is
  // what `getFeaturedProducts()`'s default limit of 4 was doing) is worse
  // than a longer scroller. The "Voir toute la collection" link below
  // still goes to /boutique for the grid view.
  const products = await getProducts();

  return (
    <section id="creations" className="snap-section py-24">
      {/* Heading and footer link stay in the site's normal centered
          max-w-6xl column — only the carousel itself (below) breaks out
          to the full screen width, so cards can start/end near the
          actual viewport edges instead of a centered container's
          margins. */}
      <Reveal>
        <h2 className="mx-auto max-w-6xl px-6 text-center font-heading text-3xl">
          Nos créations
        </h2>
      </Reveal>

      {products.length === 0 ? (
        <p className="mx-auto mt-8 max-w-md px-6 text-center text-encre/70">
          Les premières lampes arrivent très bientôt — repassez par ici.
        </p>
      ) : (
        <>
          <div className="mt-10">
            <ProductCarousel products={products} />
          </div>
          <p className="mt-12 px-6 text-center">
            <Link href="/boutique" className="text-sm font-medium hover:text-lueur">
              Voir toute la collection →
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
