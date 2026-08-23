"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createProduct,
  deleteProduct,
  updateProduct,
  type ProductInput,
} from "@/app/admin/(espace)/produits/actions";
import { AdminButton } from "@/components/admin/AdminButton";
import { slugify } from "@/lib/slug";

type ExistingProduct = {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
};

export function ProductForm({ product }: { product?: ExistingProduct }) {
  const router = useRouter();
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const input: ProductInput = { name, slug, description, price: Number(price) || 0 };
    const result = product
      ? await updateProduct(product.id, input)
      : await createProduct(input);

    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    if (product) {
      router.refresh();
      setSubmitting(false);
    } else if (result.data) {
      router.push(`/admin/produits/${result.data.id}`);
    }
  }

  async function handleDelete() {
    if (!product) return;
    if (!confirm(`Supprimer "${product.name}" ? Cette action est irréversible.`)) return;

    setSubmitting(true);
    setError(null);
    const result = await deleteProduct(product.id);
    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    router.push("/admin/produits");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-encre/70">Nom</span>
        <input
          required
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="input"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-encre/70">Slug (URL)</span>
        <input
          required
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          className="input"
        />
        <span className="mt-1 block text-xs text-encre/40">/boutique/{slug || "…"}</span>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-encre/70">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="input"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-encre/70">Prix (DA)</span>
        <input
          required
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="input"
        />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex items-center gap-4">
        <AdminButton
          type="submit"
          pending={submitting}
          pendingLabel={product ? "Enregistrement…" : "Création…"}
        >
          {product ? "Enregistrer" : "Créer le produit"}
        </AdminButton>
        {product ? (
          <AdminButton
            variant="ghost"
            size="sm"
            type="button"
            onClick={handleDelete}
            disabled={submitting}
          >
            Supprimer ce produit
          </AdminButton>
        ) : null}
      </div>
    </form>
  );
}
