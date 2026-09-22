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

  // La liste ne montrait qu'un nom, un prix et un nombre. Reconnaître une
  // veilleuse par son nom seul demande de se souvenir lequel est lequel ; la
  // photo et les teintes se reconnaissent d'un coup d'œil, et une rupture de
  // stock se voit sans ouvrir la fiche.
  photoUrl: string | null;
  colors: Array<{ id: number; hex: string | null; hex2: string | null; inStock: boolean }>;
};

export async function getAdminProducts(): Promise<AdminProductListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, price, product_colors ( id, color_hex, color_hex_2, in_stock, cutout_photo_url, product_photos ( url, position ) )",
    )
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((product) => {
    const colors = product.product_colors ?? [];
    // Même règle que le catalogue public : le détourage d'abord, sinon la
    // première photo de galerie du premier coloris qui en a une.
    const photoUrl =
      colors.find((c) => c.cutout_photo_url)?.cutout_photo_url ??
      colors
        .flatMap((c) => c.product_photos ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)[0]?.url ??
      null;

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      colorCount: colors.length,
      photoUrl,
      colors: colors.map((c) => ({
        id: c.id,
        hex: c.color_hex,
        hex2: c.color_hex_2,
        inStock: c.in_stock,
      })),
    };
  });
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

  // The second hue of a bicolour variant, null on a plain colour. The

  // duo stays one row, so nothing about how an order stores its colour

  // changes — see the 20260917200001 migration.

  colorHex2: string | null;
  inStock: boolean;
  cutoutPhotoUrl: string | null;
  photos: Array<{ id: number; url: string; position: number }>;
};

export async function getAdminProductColors(productId: number): Promise<AdminProductColor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_colors")
    .select(
      "id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url, product_photos ( id, url, position )",
    )
    .eq("product_id", productId)
    .order("id", { ascending: true });

  if (error || !data) return [];

  return data.map((color) => ({
    id: color.id,
    colorName: color.color_name,
    colorHex: color.color_hex,

    colorHex2: color.color_hex_2,
    inStock: color.in_stock,
    cutoutPhotoUrl: color.cutout_photo_url,
    photos: (color.product_photos ?? [])
      .slice()
      .sort((a, b) => a.position - b.position),
  }));
}
