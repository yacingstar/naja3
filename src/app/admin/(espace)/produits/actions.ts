"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/adminAuth";
import type { ActionResult } from "@/lib/actionResult";
import { createAdminClient } from "@/lib/supabase/admin";

const PHOTO_BUCKET = "product-photos";

export type ProductInput = {
  name: string;
  slug: string;
  description: string;
  price: number;
};

export async function createProduct(input: ProductInput): Promise<ActionResult<{ id: number }>> {
  await requireAdminUser();

  const name = input.name.trim();
  const slug = input.slug.trim();
  if (!name || !slug) return { ok: false, error: "Le nom et le slug sont obligatoires." };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      name,
      slug,
      description: input.description.trim(),
      price: input.price,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.code === "23505" ? "Ce slug est déjà utilisé." : "Impossible de créer le produit.",
    };
  }

  revalidatePath("/admin/produits");
  return { ok: true, data: { id: data.id } };
}

export async function updateProduct(id: number, input: ProductInput): Promise<ActionResult> {
  await requireAdminUser();

  const name = input.name.trim();
  const slug = input.slug.trim();
  if (!name || !slug) return { ok: false, error: "Le nom et le slug sont obligatoires." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ name, slug, description: input.description.trim(), price: input.price })
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Ce slug est déjà utilisé." : "Impossible d'enregistrer.",
    };
  }

  revalidatePath("/admin/produits");
  revalidatePath(`/admin/produits/${id}`);
  revalidatePath(`/boutique/${slug}`);
  return { ok: true };
}

export async function deleteProduct(id: number): Promise<ActionResult> {
  await requireAdminUser();

  const supabase = createAdminClient();
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    // ON DELETE RESTRICT from order_items.product_id (see Phase 1) — a
    // product that's ever been ordered can't be deleted, only its colors
    // toggled out of stock.
    return {
      ok: false,
      error: "Impossible de supprimer ce produit — il fait peut-être partie d'une commande existante.",
    };
  }

  revalidatePath("/admin/produits");
  return { ok: true };
}

export type ColorInput = {
  colorName: string;
  colorHex: string | null;
  inStock: boolean;
};

export async function addColor(
  productId: number,
  input: ColorInput,
): Promise<ActionResult<{ id: number }>> {
  await requireAdminUser();

  const colorName = input.colorName.trim();
  if (!colorName) return { ok: false, error: "Le nom de la couleur est obligatoire." };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("product_colors")
    .insert({
      product_id: productId,
      color_name: colorName,
      color_hex: input.colorHex,
      in_stock: input.inStock,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error:
        error?.code === "23505"
          ? "Cette couleur existe déjà pour ce produit."
          : "Impossible d'ajouter cette couleur.",
    };
  }

  revalidatePath(`/admin/produits/${productId}`);
  return { ok: true, data: { id: data.id } };
}

export async function updateColor(
  colorId: number,
  productId: number,
  input: ColorInput,
): Promise<ActionResult> {
  await requireAdminUser();

  const colorName = input.colorName.trim();
  if (!colorName) return { ok: false, error: "Le nom de la couleur est obligatoire." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("product_colors")
    .update({ color_name: colorName, color_hex: input.colorHex, in_stock: input.inStock })
    .eq("id", colorId);

  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "Cette couleur existe déjà pour ce produit."
          : "Impossible d'enregistrer.",
    };
  }

  revalidatePath(`/admin/produits/${productId}`);
  return { ok: true };
}

export async function deleteColor(colorId: number, productId: number): Promise<ActionResult> {
  await requireAdminUser();

  const supabase = createAdminClient();

  const { data: photos } = await supabase
    .from("product_photos")
    .select("url")
    .eq("product_color_id", colorId);

  const { error } = await supabase.from("product_colors").delete().eq("id", colorId);

  if (error) {
    // ON DELETE RESTRICT from order_items.product_color_id (see Phase 1) —
    // a color that's ever been ordered can't be deleted, only toggled
    // out of stock.
    return {
      ok: false,
      error: "Impossible de supprimer cette couleur — elle fait peut-être partie d'une commande existante.",
    };
  }

  const paths = (photos ?? []).map((p) => storagePathFromUrl(p.url)).filter((p): p is string => Boolean(p));
  if (paths.length > 0) {
    await supabase.storage.from(PHOTO_BUCKET).remove(paths);
  }

  revalidatePath(`/admin/produits/${productId}`);
  return { ok: true };
}

function storagePathFromUrl(url: string): string | null {
  const marker = `/${PHOTO_BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length);
}

export async function uploadPhoto(
  colorId: number,
  productId: number,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdminUser();

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Merci de choisir une image." };
  }

  const supabase = createAdminClient();

  const { count } = await supabase
    .from("product_photos")
    .select("id", { count: "exact", head: true })
    .eq("product_color_id", colorId);

  const path = `${colorId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type });

  if (uploadError) return { ok: false, error: "Impossible de téléverser la photo." };

  const { data: publicUrl } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);

  const { error: insertError } = await supabase.from("product_photos").insert({
    product_color_id: colorId,
    url: publicUrl.publicUrl,
    position: count ?? 0,
  });

  if (insertError) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    return { ok: false, error: "Impossible d'enregistrer la photo." };
  }

  revalidatePath(`/admin/produits/${productId}`);
  return { ok: true };
}

export async function deletePhoto(
  photoId: number,
  url: string,
  productId: number,
): Promise<ActionResult> {
  await requireAdminUser();

  const supabase = createAdminClient();
  const { error } = await supabase.from("product_photos").delete().eq("id", photoId);
  if (error) return { ok: false, error: "Impossible de supprimer la photo." };

  const path = storagePathFromUrl(url);
  if (path) await supabase.storage.from(PHOTO_BUCKET).remove([path]);

  revalidatePath(`/admin/produits/${productId}`);
  return { ok: true };
}
