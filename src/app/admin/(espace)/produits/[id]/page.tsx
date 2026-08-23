import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { getAdminProductById, getAdminProductColors } from "@/lib/adminProducts";

export default async function ProduitDetailPage({
  params,
}: PageProps<"/admin/produits/[id]">) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isFinite(productId)) notFound();

  // In parallel: the colours query only needs the id from the URL, so waiting
  // for the product to come back first was costing a whole round-trip
  // (~200ms) for nothing.
  const [product, colors] = await Promise.all([
    getAdminProductById(productId),
    getAdminProductColors(productId),
  ]);

  if (!product) notFound();

  return (
    <div>
      <Link href="/admin/produits" className="text-sm text-encre/60 hover:text-encre">
        ← Tous les produits
      </Link>

      <h1 className="mt-4 font-heading text-2xl">{product.name}</h1>

      <div className="mt-8">
        <ProductEditor product={product} colors={colors} />
      </div>
    </div>
  );
}
