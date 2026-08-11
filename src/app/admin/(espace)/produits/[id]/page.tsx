import Link from "next/link";
import { notFound } from "next/navigation";
import { ColorManager } from "@/components/admin/ColorManager";
import { ProductForm } from "@/components/admin/ProductForm";
import { getAdminProductById, getAdminProductColors } from "@/lib/adminProducts";

export default async function ProduitDetailPage({
  params,
}: PageProps<"/admin/produits/[id]">) {
  const { id } = await params;
  const productId = Number(id);
  const product = Number.isFinite(productId) ? await getAdminProductById(productId) : null;

  if (!product) notFound();

  const colors = await getAdminProductColors(product.id);

  return (
    <div>
      <Link href="/admin/produits" className="text-sm text-encre/60 hover:text-encre">
        ← Tous les produits
      </Link>

      <h1 className="mt-4 font-heading text-2xl">{product.name}</h1>

      <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-2">
        <section>
          <h2 className="font-heading text-lg">Détails</h2>
          <div className="mt-4">
            <ProductForm product={product} />
          </div>
        </section>

        <section>
          <h2 className="font-heading text-lg">Couleurs</h2>
          <div className="mt-4">
            <ColorManager productId={product.id} colors={colors} />
          </div>
        </section>
      </div>
    </div>
  );
}
