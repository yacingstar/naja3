import { cache } from "react";
// The cookie-free client on purpose — see supabase/public.ts. The catalogue
// is identical for every visitor, and reading cookies here would force every
// storefront page to re-render per request, making `revalidate` a no-op.
import { createPublicClient } from "@/lib/supabase/public";

export type FeaturedProductColor = {
  id: number;
  colorName: string;
  colorHex: string | null;

  // The second hue of a bicolour variant, null on a plain colour. The

  // duo stays one row, so nothing about how an order stores its colour

  // changes — see the 20260917200001 migration.

  colorHex2: string | null;
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

  // The second hue of a bicolour variant, null on a plain colour. The

  // duo stays one row, so nothing about how an order stores its colour

  // changes — see the 20260917200001 migration.

  colorHex2: string | null;
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

    color_hex_2: string | null;
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

    colorHex2: color.color_hex_2,
    inStock: color.in_stock,
    photoUrl: colorPhotoUrl(color),
  }));
}

const CARD_SELECT =
  "id, slug, name, description, price, product_colors ( id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url, product_photos ( url, position ) )";

// L'ordre de la vitrine, choisi à la main par la patronne (3 novembre 2026).
//
// Ce n'est aucune règle calculable : ni l'ancienneté, ni le prix, ni
// l'alphabet. Akari est plus récente que Nami et passe pourtant devant. C'est
// un ordre de présentation, et un ordre de présentation se décide.
//
// ── Pourquoi ici et pas dans la base ────────────────────────────────────────
// La table `products` n'a pas de colonne d'ordre. En septembre, pour échanger
// deux veilleuses, on avait réécrit leurs `created_at` — et la note de ce
// round-là disait déjà que c'était la version jetable, parce qu'une date de
// création qui ment reste une date de création qui ment : elle sert aussi à
// trier la liste de l'admin, et plus rien ne dit quand un produit a été ajouté.
// Le refaire sur huit produits aurait effacé huit vraies dates, dont celle
// d'Okasa, ajoutée aujourd'hui.
//
// La bonne solution reste une colonne `position` plus un réglage dans l'admin,
// pour qu'elle puisse réordonner seule. Cela demande une modification de la
// base qu'elle doit approuver et appliquer ; en attendant, la liste ci-dessous
// fait le travail sans rien abîmer.
const ORDRE_VITRINE = [
  "okasa",
  "nomura",
  "japandi",
  "champignon",
  "capricorne",
  "akari",
  "nami",
  "origami",
];

// Une veilleuse absente de la liste passe DEVANT toutes les autres : si elle
// n'y est pas, c'est qu'elle vient d'être ajoutée dans l'admin, et une
// nouveauté se montre. C'est exactement ce qui a motivé cette demande — Okasa
// venait d'arriver et se retrouvait en dernier. Entre deux inconnues, la plus
// récente d'abord (voir l'ordre de la requête).
function rangVitrine(slug: string): number {
  const i = ORDRE_VITRINE.indexOf(slug);
  return i === -1 ? -1 : i;
}

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
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(CARD_SELECT)
    // Plus récente d'abord : c'est l'ordre de repli pour toute veilleuse qui
    // n'est pas encore dans ORDRE_VITRINE. Le tri ci-dessous est stable, donc
    // les inconnues gardent cet ordre entre elles.
    .order("created_at", { ascending: false })
    .returns<ProductRow[]>();

  if (error || !data) return [];

  return data
    .slice()
    .sort((a, b) => rangVitrine(a.slug) - rangVitrine(b.slug))
    .map((product) => ({
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

    color_hex_2: string | null;
    in_stock: boolean;
    cutout_photo_url: string | null;
    product_photos: Array<{ url: string; position: number }>;
  }>;
};

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, description, price, product_colors ( id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url, product_photos ( url, position ) )",
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

        colorHex2: color.color_hex_2,
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
