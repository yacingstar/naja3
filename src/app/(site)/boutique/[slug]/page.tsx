import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/site/ProductGallery";
import { formatPrice } from "@/lib/format";
import { getProductBySlug } from "@/lib/products";

export default async function ProductPage({
  params,
}: PageProps<"/boutique/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  return (
    <main className="mx-auto max-w-5xl px-6 py-24">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start">
        <ProductGallery
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            price: product.price,
          }}
          colors={product.colors}
        />

        <div>
          <h1 className="font-heading text-3xl">{product.name}</h1>
          <p className="mt-2 text-lg text-encre/70">{formatPrice(product.price)}</p>
          <p className="mt-6 whitespace-pre-line text-encre/80">
            {product.description}
          </p>
        </div>
      </div>
    </main>
  );
}
