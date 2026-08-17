import "server-only";
import { createClient } from "@/lib/supabase/server";

// Admin-facing reads. Unlike src/lib/products.ts (public catalog), this
// never falls back to anything on error — showing stale/fake data in the
// admin screens would let someone believe they'd saved a real edit.

export type AdminProductListItem = {
  id: number;
  slug: string;
  name: string;
  price: number;
  colorCount: number;
};

export async function getAdminProducts(): Promise<AdminProductListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, price, product_colors ( id )")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    colorCount: (product.product_colors ?? []).length,
  }));
}

export type AdminProduct = {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
};

export async function getAdminProductById(id: number): Promise<AdminProduct | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, description, price")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export type AdminProductColor = {
  id: number;
  colorName: string;
  colorHex: string | null;
  inStock: boolean;
  cutoutPhotoUrl: string | null;
  photos: Array<{ id: number; url: string; position: number }>;
};

export async function getAdminProductColors(productId: number): Promise<AdminProductColor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_colors")
    .select(
      "id, color_name, color_hex, in_stock, cutout_photo_url, product_photos ( id, url, position )",
    )
    .eq("product_id", productId)
    .order("id", { ascending: true });

  if (error || !data) return [];

  return data.map((color) => ({
    id: color.id,
    colorName: color.color_name,
    colorHex: color.color_hex,
    inStock: color.in_stock,
    cutoutPhotoUrl: color.cutout_photo_url,
    photos: (color.product_photos ?? [])
      .slice()
      .sort((a, b) => a.position - b.position),
  }));
}
