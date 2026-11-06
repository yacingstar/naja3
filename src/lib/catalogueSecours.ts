// Le catalogue servi quand Supabase ne répond pas.
//
// Le 6 novembre 2026, Supabase a restreint le projet pour dépassement du
// quota d'egress : REST, Storage et Auth sont tous repartis en HTTP 402. Côté
// visiteur cela n'a pas donné une page d'erreur, ce qui aurait au moins été
// lisible — la boutique a répondu 200 avec zéro veilleuse, et les huit pages
// produit sont passées en 404, parce que `getProductBySlug` renvoyait null et
// que la page appelait `notFound()`. Une boutique vide et silencieuse.
//
// src/data/catalogue.json est la copie de ce catalogue, reconstruite depuis
// les pages pré-générées (voir scripts/extraire-catalogue.mjs), et ses photos
// sont dans public/veilleuses (voir scripts/rapatrier-photos.mjs). Les deux
// scripts se relancent quand le catalogue change.
//
// Ce qu'il couvre et ce qu'il ne couvre pas : la boutique reste consultable et
// commandable, puisque tout ce qu'un visiteur lit est ici. Les commandes, le
// stock en temps réel et l'admin ont toujours besoin de la base — une commande
// passée pendant une panne est traitée par src/lib/commandeSecours.ts.

import catalogue from "@/data/catalogue.json";
import type { DeliveryRate } from "@/lib/deliveryRates";
import type {
  FeaturedProduct,
  ProductColorDetail,
  ProductDetail,
} from "@/lib/products";

type ColorisJson = {
  id: number;
  colorName: string;
  colorHex: string | null;
  colorHex2: string | null;
  cutoutPhotoUrl: string | null;
  inStock: boolean;
  photos: Array<{ url: string; position: number }>;
};

type ProduitJson = {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  colors: ColorisJson[];
};

const PRODUITS = (catalogue.produits ?? []) as ProduitJson[];

const LIVRAISON = (catalogue.livraison ?? []) as DeliveryRate[];

export function catalogueDisponible(): boolean {
  return PRODUITS.length > 0;
}

// Les 58 wilayas et leurs deux prix, dans l'ordre où le menu les attend
// (« 01 Adrar ».. « 58 El Meniaa » : les numéros sur deux chiffres se trient
// correctement comme du texte).
export function tarifsDeSecours(): DeliveryRate[] {
  return LIVRAISON.slice().sort((a, b) => a.wilaya.localeCompare(b.wilaya));
}

// Mêmes règles que la version Supabase, volontairement : une découpe sur fond
// transparent d'abord, sinon la première photo de la galerie. Si les deux
// chemins divergeaient, un visiteur verrait la boutique changer d'allure selon
// que la base répond ou non.
function photoDuColoris(c: ColorisJson): string | null {
  if (c.cutoutPhotoUrl) return c.cutoutPhotoUrl;
  return c.photos?.slice().sort((a, b) => a.position - b.position)[0]?.url ?? null;
}

function colorisEnStockDAbord(colors: ColorisJson[]): ColorisJson[] {
  return colors.slice().sort((a, b) => Number(b.inStock) - Number(a.inStock));
}

export function produitsDeSecours(): FeaturedProduct[] {
  return PRODUITS.map((p) => {
    const premier = p.colors.find((c) => c.inStock) ?? p.colors[0];
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      price: p.price,
      photoUrl: premier ? photoDuColoris(premier) : null,
      colors: p.colors.map((c) => ({
        id: c.id,
        colorName: c.colorName,
        colorHex: c.colorHex,
        colorHex2: c.colorHex2,
        inStock: c.inStock,
        photoUrl: photoDuColoris(c),
      })),
    };
  });
}

export function produitDeSecoursParSlug(slug: string): ProductDetail | null {
  const p = PRODUITS.find((x) => x.slug === slug);
  if (!p) return null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    price: p.price,
    colors: colorisEnStockDAbord(p.colors).map(
      (c): ProductColorDetail => ({
        id: c.id,
        colorName: c.colorName,
        colorHex: c.colorHex,
        colorHex2: c.colorHex2,
        inStock: c.inStock,
        cutoutPhotoUrl: c.cutoutPhotoUrl,
        photos: (c.photos ?? []).slice().sort((a, b) => a.position - b.position),
      }),
    ),
  };
}
