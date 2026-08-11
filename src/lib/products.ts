import { createClient } from "@/lib/supabase/server";

export type FeaturedProduct = {
  id: number;
  slug: string;
  name: string;
  price: number;
  photoUrl: string | null;
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

// Real data from day one — no mock catalog. Returns an empty list until
// products exist (Phase 5 admin panel), and the homepage handles that
// gracefully rather than showing fake content.
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

  return data.map((product) => {
    const colors = product.product_colors ?? [];
    const color = colors.find((c) => c.in_stock) ?? colors[0];
    const photo = color?.product_photos
      ?.slice()
      .sort((a, b) => a.position - b.position)[0];

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      photoUrl: photo?.url ?? null,
    };
  });
}
