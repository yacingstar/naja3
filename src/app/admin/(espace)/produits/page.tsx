import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { getAdminProducts } from "@/lib/adminProducts";

export default async function ProduitsPage() {
  const products = await getAdminProducts();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl">Produits</h1>
        <Link
          href="/admin/produits/nouveau"
          className="rounded-full bg-lueur px-5 py-2 text-sm font-medium text-encre transition hover:bg-lueur/90"
        >
          Nouveau produit
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="mt-10 text-encre/60">Aucun produit pour le moment.</p>
      ) : (
        <table className="mt-8 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-encre/10 text-left text-encre/50">
              <th className="py-2 pr-4 font-medium">Nom</th>
              <th className="py-2 pr-4 font-medium">Prix</th>
              <th className="py-2 pr-4 font-medium">Couleurs</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-encre/5">
                <td className="py-3 pr-4">
                  <Link
                    href={`/admin/produits/${product.id}`}
                    className="font-medium hover:text-lueur"
                  >
                    {product.name}
                  </Link>
                </td>
                <td className="py-3 pr-4">{formatPrice(product.price)}</td>
                <td className="py-3 pr-4">{product.colorCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
