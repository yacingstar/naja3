import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { G, M } from "@/components/serie/style";
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
      <Link href="/admin/produits" className={`${M} text-[11px] tracking-[.12em] uppercase underline underline-offset-4 opacity-70 transition hover:opacity-100`}>
        ← Tous les produits
      </Link>

      <h1 className={`${G} mt-4 text-[36px] leading-none font-bold tracking-[-.03em] sm:text-[44px]`}>
        {product.name}
      </h1>

      <div className="mt-7">
        <ProductEditor product={product} colors={colors} />
      </div>
    </div>
  );
}
