"use client";

import { AdminButton, Spinner } from "@/components/admin/AdminButton";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  deleteColor,
  deleteCutoutPhoto,
  deletePhoto,
  uploadCutoutPhoto,
  uploadPhoto,
} from "@/app/admin/(espace)/produits/actions";
import type { AdminProductColor } from "@/lib/adminProducts";

// Field values are owned by ProductEditor now, not by this row: the page has
// one save button, so one place has to hold the whole draft. Photos and
// deleting the colour stay immediate — picking a file IS the action, and a
// delete needs its own confirmation either way.
export function ColorRow({
  productId,
  color,
  value,
  onChange,
}: {
  productId: number;
  color: AdminProductColor;
  value: { colorName: string; colorHex: string; inStock: boolean };
  onChange: (next: { colorName: string; colorHex: string; inStock: boolean }) => void;
}) {
  const router = useRouter();
  const { colorName, colorHex, inStock } = value;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCutout, setUploadingCutout] = useState(false);
  const cutoutFileInputRef = useRef<HTMLInputElement>(null);

  function handleDelete() {
    if (!confirm(`Supprimer la couleur "${color.colorName}" ?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteColor(color.id, productId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("photo", file);
      const result = await uploadPhoto(color.id, productId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      // A rejected Server Action call (e.g. the request body exceeding
      // Next's serverActions.bodySizeLimit) never reaches uploadPhoto's own
      // try/catch — without this, a too-large photo fails completely
      // silently: no thumbnail, no error, nothing saved.
      setError("Photo trop volumineuse ou connexion interrompue. Réessayez avec une image plus légère.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleDeletePhoto(photoId: number, url: string) {
    setError(null);
    startTransition(async () => {
      const result = await deletePhoto(photoId, url, productId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  async function handleCutoutFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCutout(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("photo", file);
      const result = await uploadCutoutPhoto(color.id, productId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError("Photo trop volumineuse ou connexion interrompue. Réessayez avec une image plus légère.");
    } finally {
      setUploadingCutout(false);
      if (cutoutFileInputRef.current) cutoutFileInputRef.current.value = "";
    }
  }

  function handleDeleteCutout() {
    setError(null);
    startTransition(async () => {
      const result = await deleteCutoutPhoto(color.id, productId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-encre/10 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-encre/70">Nom</span>
          <input
            value={colorName}
            onChange={(e) => onChange({ ...value, colorName: e.target.value })}
            className="input w-40"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-encre/70">Teinte</span>
          <input
            type="color"
            value={colorHex}
            onChange={(e) => onChange({ ...value, colorHex: e.target.value })}
            className="h-10 w-14 rounded border border-encre/20"
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => onChange({ ...value, inStock: e.target.checked })}
          />
          En stock
        </label>
        <AdminButton
          variant="ghost"
          size="sm"
          type="button"
          onClick={handleDelete}
          pending={isPending}
          pendingLabel="Suppression…"
        >
          Supprimer la couleur
        </AdminButton>
      </div>
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}

      <p className="mt-4 text-xs font-medium text-encre/50">
        Photos (galerie — fiche produit)
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        {color.photos.map((photo) => (
          <div key={photo.id} className="relative">
            <Image
              src={photo.url}
              alt=""
              width={80}
              height={80}
              sizes="80px"
              quality={85}
              className="h-20 w-20 rounded-xl object-cover"
            />
            <button
              type="button"
              onClick={() => handleDeletePhoto(photo.id, photo.url)}
              aria-label="Supprimer la photo"
              disabled={isPending}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-encre text-xs text-papier transition-all duration-150 hover:bg-red-700 active:scale-90 disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        ))}
        <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border border-dashed border-encre/30 text-center text-xs text-encre/50 hover:border-encre">
          {uploading ? <Spinner /> : "+ Photo"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      <p className="mt-4 text-xs font-medium text-encre/50">
        Photo sans fond (cartes — accueil, boutique)
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        {color.cutoutPhotoUrl ? (
          <div className="relative">
            <Image
              src={color.cutoutPhotoUrl}
              alt=""
              width={80}
              height={80}
              sizes="80px"
              quality={85}
              className="h-20 w-20 rounded-xl bg-blush object-contain"
            />
            <button
              type="button"
              onClick={handleDeleteCutout}
              aria-label="Supprimer la photo sans fond"
              disabled={isPending}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-encre text-xs text-papier transition-all duration-150 hover:bg-red-700 active:scale-90 disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        ) : (
          <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border border-dashed border-encre/30 text-center text-xs text-encre/50 hover:border-encre">
            {uploadingCutout ? <Spinner /> : "+ Photo"}
            <input
              ref={cutoutFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCutoutFileChange}
              className="hidden"
            />
          </label>
        )}
      </div>
      <p className="mt-1 text-xs text-encre/40">
        Sans photo sans fond, les cartes utilisent la première photo de la galerie.
      </p>
    </div>
  );
}
