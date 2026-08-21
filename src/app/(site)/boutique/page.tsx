import { ProductCard } from "@/components/site/ProductCard";
import { Reveal } from "@/components/site/Reveal";
import { getProducts } from "@/lib/products";

// See the note on the homepage: CDN-served, with admin edits pushing through
// immediately via revalidatePath and this window as the backstop.
export const revalidate = 300;

export default async function BoutiquePage() {
  const products = await getProducts();

  return (
    <main className="mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <h1 className="text-center font-heading text-4xl">La boutique</h1>
      </Reveal>

      {products.length === 0 ? (
        <p className="mx-auto mt-8 max-w-md text-center text-encre/70">
          Les premières lampes arrivent très bientôt — repassez par ici.
        </p>
      ) : (
        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      )}
    </main>
  );
}
