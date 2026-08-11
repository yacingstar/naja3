import { createClient } from "@/lib/supabase/server";

export type FeaturedProduct = {
  id: number;
  slug: string;
  name: string;
  price: number;
  photoUrl: string | null;
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
  price: number;
  product_colors: Array<{
    in_stock: boolean;
    product_photos: Array<{ url: string; position: number }>;
  }>;
};

function firstPhoto(colors: ProductRow["product_colors"]) {
  const color = colors.find((c) => c.in_stock) ?? colors[0];
  return color?.product_photos?.slice().sort((a, b) => a.position - b.position)[0];
}

// Real data from day one — no mock catalog. Returns an empty list until
// products exist (Phase 5 admin panel), and callers handle that gracefully
// rather than showing fake content.
export async function getFeaturedProducts(limit = 4): Promise<FeaturedProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, price, product_colors ( in_stock, product_photos ( url, position ) )",
    )
    .order("created_at", { ascending: true })
    .limit(limit)
    .returns<ProductRow[]>();

  if (error || !data) return [];

  return data.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    photoUrl: firstPhoto(product.product_colors ?? [])?.url ?? null,
  }));
}

export async function getProducts(): Promise<FeaturedProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, price, product_colors ( in_stock, product_photos ( url, position ) )",
    )
    .order("created_at", { ascending: true })
    .returns<ProductRow[]>();

  if (error || !data) return [];

  return data.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    photoUrl: firstPhoto(product.product_colors ?? [])?.url ?? null,
  }));
}

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
    product_photos: Array<{ url: string; position: number }>;
  }>;
};

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, description, price, product_colors ( id, color_name, color_hex, in_stock, product_photos ( url, position ) )",
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
        inStock: color.in_stock,
        photos: (color.product_photos ?? [])
          .slice()
          .sort((a, b) => a.position - b.position),
      }))
      // in-stock colors first, so the default selection is something buyable
      .sort((a, b) => Number(b.inStock) - Number(a.inStock)),
  };
}
