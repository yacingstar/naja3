import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type FeaturedProductColor = {
  id: number;
  colorName: string;
  colorHex: string | null;
  inStock: boolean;
  // This specific colour's card photo (cutout preferred, first gallery
  // shot as fallback) — same rule as the product-level `photoUrl` below,
  // just not collapsed to one "default" colour. Hero.tsx needs it to hang
  // each lamp in a different colour; card components can keep ignoring it.
  photoUrl: string | null;
};

export type FeaturedProduct = {
  id: number;
  slug: string;
  name: string;
  // Cards show a short blurb now (aardvarkbookclub.com-style catalog
  // card), so this is selected for card queries too — not just the
  // detail page.
  description: string;
  price: number;
  photoUrl: string | null;
  colors: FeaturedProductColor[];
};

export type ProductPhoto = {
  url: string;
  position: number;
};

export type ProductColorDetail = {
  id: number;
  colorName: string;
  colorHex: string | null;
  inStock: boolean;
  // The background-removed shot, when the admin has set one. The detail
  // page leads with it (ProductStage lights it like a lamp that's on)
  // and keeps the real backdrop photos as the shots behind it.
  cutoutPhotoUrl: string | null;
  photos: ProductPhoto[];
};

export type ProductDetail = {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  colors: ProductColorDetail[];
};

type ProductRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  product_colors: Array<{
    id: number;
    color_name: string;
    color_hex: string | null;
    in_stock: boolean;
    cutout_photo_url: string | null;
    product_photos: Array<{ url: string; position: number }>;
  }>;
};

// Cards (homepage hero/preview, /boutique listing) prefer a color's
// dedicated cutout (background-removed) photo when set, falling back to
// its normal first gallery photo otherwise. The product detail page
// (getProductBySlug below) never uses the cutout — it shows the full
// gallery with real backdrops, on purpose.
function colorPhotoUrl(
  color: ProductRow["product_colors"][number],
): string | null {
  if (color.cutout_photo_url) return color.cutout_photo_url;
  return (
    color.product_photos?.slice().sort((a, b) => a.position - b.position)[0]?.url ?? null
  );
}

function cardPhotoUrl(colors: ProductRow["product_colors"]): string | null {
  const color = colors.find((c) => c.in_stock) ?? colors[0];
  if (!color) return null;
  return colorPhotoUrl(color);
}

function cardColors(colors: ProductRow["product_colors"]): FeaturedProductColor[] {
  return colors.map((color) => ({
    id: color.id,
    colorName: color.color_name,
    colorHex: color.color_hex,
    inStock: color.in_stock,
    photoUrl: colorPhotoUrl(color),
  }));
}

const CARD_SELECT =
  "id, slug, name, description, price, product_colors ( id, color_name, color_hex, in_stock, cutout_photo_url, product_photos ( url, position ) )";

// Real data from day one — no mock catalog. Returns an empty list until
// products exist (Phase 5 admin panel), and callers handle that gracefully
// rather than showing fake content.
//
// Wrapped in React's `cache` so several components in one render share a
// single query: the homepage renders both Hero (which wants the first few)
// and CatalogPreview (which wants all of them), and this used to be two
// near-identical round trips to Supabase differing only by a LIMIT. Callers
// that need fewer slice the result — the query CatalogPreview needs is a
// superset of Hero's anyway, so there is nothing extra to fetch.
export const getProducts = cache(async (): Promise<FeaturedProduct[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(CARD_SELECT)
    .order("created_at", { ascending: true })
    .returns<ProductRow[]>();

  if (error || !data) return [];

  return data.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: product.price,
    photoUrl: cardPhotoUrl(product.product_colors ?? []),
    colors: cardColors(product.product_colors ?? []),
  }));
});

type ProductDetailRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  product_colors: Array<{
    id: number;
    color_name: string;
    color_hex: string | null;
    in_stock: boolean;
    cutout_photo_url: string | null;
    product_photos: Array<{ url: string; position: number }>;
  }>;
};

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, description, price, product_colors ( id, color_name, color_hex, in_stock, cutout_photo_url, product_photos ( url, position ) )",
    )
    .eq("slug", slug)
    .maybeSingle()
    .returns<ProductDetailRow>();

  if (error || !data) return null;

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    price: data.price,
    colors: (data.product_colors ?? [])
      .map((color) => ({
        id: color.id,
        colorName: color.color_name,
        colorHex: color.color_hex,
        cutoutPhotoUrl: color.cutout_photo_url,
        inStock: color.in_stock,
        photos: (color.product_photos ?? [])
          .slice()
          .sort((a, b) => a.position - b.position),
      }))
      // in-stock colors first, so the default selection is something buyable
      .sort((a, b) => Number(b.inStock) - Number(a.inStock)),
  };
}
