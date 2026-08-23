"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addColor } from "@/app/admin/(espace)/produits/actions";
import { AdminButton } from "@/components/admin/AdminButton";
import { ColorRow } from "@/components/admin/ColorRow";
import type { AdminProductColor } from "@/lib/adminProducts";

type ColorDraft = { colorName: string; colorHex: string; inStock: boolean };

export function ColorManager({
  productId,
  colors,
  drafts,
  onDraftChange,
}: {
  productId: number;
  colors: AdminProductColor[];
  // Field values live in ProductEditor so one save button covers them all.
  drafts: Record<number, ColorDraft>;
  onDraftChange: (id: number, next: ColorDraft) => void;
}) {
  const router = useRouter();
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#f2a65a");
  const [inStock, setInStock] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addColor(productId, { colorName, colorHex, inStock });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setColorName("");
      router.refresh();
    });
  }

  return (
    <div>
      {colors.length === 0 ? (
        <p className="text-sm text-encre/60">Aucune couleur pour le moment.</p>
      ) : (
        <div className="space-y-4">
          {colors.map((color) => (
            <ColorRow
              key={color.id}
              productId={productId}
              color={color}
              value={
                drafts[color.id] ?? {
                  colorName: color.colorName,
                  colorHex: color.colorHex ?? "#e5d9cf",
                  inStock: color.inStock,
                }
              }
              onChange={(next) => onDraftChange(color.id, next)}
            />
          ))}
        </div>
      )}

      <form
        onSubmit={handleAdd}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-encre/10 bg-blush/20 p-4"
      >
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-encre/70">Nouvelle couleur</span>
          <input
            required
            value={colorName}
            onChange={(e) => setColorName(e.target.value)}
            placeholder="Ambre"
            className="input w-40"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-encre/70">Teinte</span>
          <input
            type="color"
            value={colorHex}
            onChange={(e) => setColorHex(e.target.value)}
            className="h-10 w-14 rounded border border-encre/20"
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
          />
          En stock
        </label>
        <AdminButton type="submit" size="sm" pending={isPending} pendingLabel="Ajout…">
          Ajouter la couleur
        </AdminButton>
        {error ? <p className="w-full text-sm text-red-700">{error}</p> : null}
      </form>
    </div>
  );
}
