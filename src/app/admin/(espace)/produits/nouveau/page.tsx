import { ProductForm } from "@/components/admin/ProductForm";

export default function NouveauProduitPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl">Nouveau produit</h1>
      <p className="mt-2 text-sm text-encre/60">
        Les couleurs et photos s&apos;ajoutent une fois le produit créé.
      </p>
      <div className="mt-8">
        <ProductForm />
      </div>
    </div>
  );
}
