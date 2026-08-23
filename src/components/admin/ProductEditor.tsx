"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminButton } from "@/components/admin/AdminButton";
import { ColorManager } from "@/components/admin/ColorManager";
import {
  deleteProduct,
  saveProductAndColors,
} from "@/app/admin/(espace)/produits/actions";
import type { AdminProductColor } from "@/lib/adminProducts";
import { slugify } from "@/lib/slug";

type ExistingProduct = {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
};

type ColorDraft = { colorName: string; colorHex: string; inStock: boolean };

// Owns the whole edit page as one draft with one save button.
//
// Before, the page had a save on the product form and another on every colour
// row — six or more on a product with a few colours — and nothing told you
// which ones you still had to press. Now everything typed anywhere is part of
// one draft, a bar appears the moment something differs from what's stored,
// and one button writes it all.
//
// Photos deliberately stay outside the draft: uploading a file has to happen
// when you pick it, and queueing uploads behind a save button would mean a
// long silent wait and a messy half-written state if one failed.
export function ProductEditor({
  product,
  colors,
}: {
  product: ExistingProduct;
  colors: AdminProductColor[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(String(product.price));

  const [drafts, setDrafts] = useState<Record<number, ColorDraft>>(() =>
    Object.fromEntries(
      colors.map((c) => [
        c.id,
        { colorName: c.colorName, colorHex: c.colorHex ?? "#e5d9cf", inStock: c.inStock },
      ]),
    ),
  );

  // Compared against the server's values rather than tracked with a flag, so
  // typing something and undoing it correctly leaves you with nothing to save.
  const productDirty =
    name !== product.name ||
    slug !== product.slug ||
    description !== product.description ||
    price !== String(product.price);

  const colorsDirty = colors.some((c) => {
    const d = drafts[c.id];
    if (!d) return false;
    return (
      d.colorName !== c.colorName ||
      d.colorHex !== (c.colorHex ?? "#e5d9cf") ||
      d.inStock !== c.inStock
    );
  });

  const dirty = productDirty || colorsDirty;

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveProductAndColors(
        product.id,
        { name, slug, description, price: Number(price) || 0 },
        colors.map((c) => ({ id: c.id, ...drafts[c.id] })),
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(`Supprimer "${product.name}" ? Cette action est irréversible.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProduct(product.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/produits");
    });
  }

  return (
    <div className="pb-28">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        <section>
          <h2 className="font-heading text-lg">Détails</h2>
          <div className="mt-4 max-w-lg space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-encre/70">Nom</span>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (slug === slugify(name)) setSlug(slugify(e.target.value));
                }}
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-encre/70">
                Slug (URL)
              </span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="input"
              />
              <span className="mt-1 block text-xs text-encre/40">
                /boutique/{slug || "…"}
              </span>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-encre/70">
                Description
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-encre/70">
                Prix (DA)
              </span>
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="input"
              />
            </label>
          </div>
        </section>

        <section>
          <h2 className="font-heading text-lg">Couleurs</h2>
          <p className="mt-1 text-xs text-encre/50">
            Les photos s&apos;enregistrent tout de suite. Le reste part avec le bouton
            « Enregistrer ».
          </p>
          <div className="mt-4">
            <ColorManager
              productId={product.id}
              colors={colors}
              drafts={drafts}
              onDraftChange={(id, next) =>
                setDrafts((prev) => ({ ...prev, [id]: next }))
              }
            />
          </div>
        </section>
      </div>

      {/* Sticky so the save button is reachable without scrolling back up —
          a product with several colours makes for a long page. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-encre/10 bg-papier/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-6 py-4">
          <AdminButton
            onClick={handleSave}
            pending={isPending}
            pendingLabel="Enregistrement…"
            disabled={!dirty}
          >
            Enregistrer
          </AdminButton>

          <span aria-live="polite" className="text-sm">
            {error ? (
              <span className="text-red-700">{error}</span>
            ) : isPending ? (
              <span className="text-encre/50">Enregistrement en cours…</span>
            ) : dirty ? (
              <span className="text-encre/60">Modifications non enregistrées</span>
            ) : saved ? (
              <span className="text-sauge">Enregistré ✓</span>
            ) : (
              <span className="text-encre/40">Tout est à jour</span>
            )}
          </span>

          <AdminButton
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
            className="ml-auto"
          >
            Supprimer ce produit
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
