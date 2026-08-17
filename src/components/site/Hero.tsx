import Link from "next/link";
import { HangingLamp } from "@/components/site/HangingLamp";
import { LampIllustration } from "@/components/site/LampIllustration";
import { WavyBackground } from "@/components/site/WavyBackground";
import { getProducts, type FeaturedProduct } from "@/lib/products";

// Per-lamp rig, applied by position in the row. Cord lengths and sizes
// are deliberately uneven so the row reads as hand-hung rather than a
// tidy chart; swing durations are all different so the lamps never move
// in lockstep, and drop delays stagger their entrance left-to-right.
//
// Lengths/widths are clamp() rather than fixed px or Tailwind breakpoint
// classes: they scale continuously with the viewport, so the same rig
// works from a 320px phone up to a wide desktop without a separate
// mobile table to keep in sync.
const LAMP_RIG = [
  {
    cord: "clamp(44px, 6.5vw, 100px)",
    width: "clamp(5.5rem, 11vw, 10rem)",
    swing: "3.6s",
    delay: "0ms",
    hideOnMobile: true,
  },
  {
    cord: "clamp(72px, 11.5vw, 170px)",
    width: "clamp(5rem, 10vw, 9rem)",
    swing: "4.4s",
    delay: "120ms",
    hideOnMobile: false,
  },
  {
    cord: "clamp(32px, 5vw, 76px)",
    width: "clamp(6rem, 12vw, 11rem)",
    swing: "3.9s",
    delay: "240ms",
    hideOnMobile: false,
  },
  {
    cord: "clamp(80px, 12.5vw, 185px)",
    width: "clamp(5.25rem, 10.5vw, 9.5rem)",
    swing: "4.7s",
    delay: "360ms",
    hideOnMobile: true,
  },
  {
    cord: "clamp(56px, 8.5vw, 128px)",
    width: "clamp(5.5rem, 11vw, 10rem)",
    swing: "3.3s",
    delay: "480ms",
    hideOnMobile: false,
  },
];

// Colour names are admin-entered, so "Rosée" / "Rosee" / "rose-e" all have
// to collapse to one key before we can tell two lamps apart by colour.
// Decomposing first (NFD) splits an accent off its letter, then dropping
// every non-alphanumeric takes the accent, spaces and punctuation with it.
function colorKey(name: string): string {
  return name
    .normalize("NFD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

// Photographed, buyable colours only — a lamp hangs on a bare cord with no
// frame, so a colour with no cutout/gallery photo has nothing to hang.
function lampPool(product: FeaturedProduct) {
  const photographed = product.colors.filter((c) => c.photoUrl);
  const inStock = photographed.filter((c) => c.inStock);
  return inStock.length > 0 ? inStock : photographed;
}

// Hangs each lamp in a DIFFERENT colour. Products all tend to list their
// "Rouge" variant first, and `photoUrl` on the product just takes the
// first in-stock colour — so left to itself the rail rendered two reds
// side by side. This walks the rail claiming an unused colour per lamp.
//
// Scarcest-first: a product with a single photographed colour is assigned
// before one with six options, otherwise a six-colour product upstream can
// take the only colour a later lamp had available. Display order is
// untouched — this only decides which variant each lamp wears.
function pickLampColors(products: FeaturedProduct[]) {
  const used = new Set<string>();
  const picks = new Map<number, FeaturedProduct["colors"][number] | undefined>();

  for (const { product, pool } of products
    .map((product) => ({ product, pool: lampPool(product) }))
    .slice()
    .sort((a, b) => a.pool.length - b.pool.length)) {
    const pick = pool.find((c) => !used.has(colorKey(c.colorName))) ?? pool[0];
    if (pick) used.add(colorKey(pick.colorName));
    picks.set(product.id, pick);
  }

  return products.map((product) => {
    const color = picks.get(product.id);
    return {
      product,
      // Falls back to the product's own default photo so a product with no
      // photographed colour at all still behaves exactly as it did before.
      photoUrl: color?.photoUrl ?? product.photoUrl,
      colorName: color?.colorName ?? null,
    };
  });
}

export async function Hero() {
  // One product per hanging lamp. Real products rather than generic
  // illustrations (the aardvarkbookclub.com reference hangs generic book
  // covers because its catalog is a rotating surprise box — it can't show
  // real titles; Naja's catalog is small and fixed, so every lamp here can
  // double as a shortcut straight to its own product page).
  // getProducts is request-cached, so this shares CatalogPreview's query
  // rather than issuing a second one just to fetch fewer rows.
  const products = (await getProducts()).slice(0, LAMP_RIG.length);
  const lamps = pickLampColors(products);

  return (
    <section
      style={{ marginTop: "calc(-1 * var(--header-height))" }}
      className="relative flex min-h-[calc(100vh+4rem)] flex-col items-center justify-center overflow-hidden rounded-b-[clamp(2rem,6vw,4rem)] px-6 pt-52 pb-16 sm:pt-[24rem] sm:pb-24"
    >
      <WavyBackground />

      {/* The hanging row. `justify-between` (not absolute left offsets)
          means hiding the two mobile-hidden lamps simply lets the
          remaining three re-spread evenly — no second set of positions to
          maintain. pointer-events are off on the rail so it can overlap
          the headline harmlessly, and back on for each lamp itself. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 mx-auto flex w-full max-w-6xl items-start justify-between px-4 sm:px-8">
        {LAMP_RIG.map((rig, index) => {
          const lamp = lamps[index];
          const product = lamp?.product;
          const hidden = rig.hideOnMobile ? "hidden sm:flex" : "flex";

          return (
            <HangingLamp
              key={product?.id ?? index}
              cordLength={rig.cord}
              swingDuration={rig.swing}
              dropDelay={rig.delay}
              className={hidden}
            >
              {product && lamp?.photoUrl ? (
                <Link
                  href={`/boutique/${product.slug}`}
                  className="pointer-events-auto relative block transition-transform duration-300 hover:scale-110"
                >
                  <span
                    aria-hidden
                    className="absolute inset-3 -z-10 rounded-full bg-lueur/40 blur-2xl"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL, cutout photo hung straight on the cord (no frame) */}
                  <img
                    src={lamp.photoUrl}
                    alt={
                      lamp.colorName ? `${product.name} — ${lamp.colorName}` : product.name
                    }
                    style={{ width: rig.width }}
                    className="h-auto drop-shadow-lg"
                  />
                </Link>
              ) : (
                // Empty catalog: hang the house illustration instead, so
                // the hero is never a bare wall of text.
                <LampIllustration size="sm" />
              )}
            </HangingLamp>
          );
        })}
      </div>

      <div className="relative text-center">
        <p className="font-hand text-2xl text-crepuscule sm:text-3xl">
          fait main, à la commande
        </p>
        <h1 className="mx-auto mt-3 max-w-5xl font-heading text-5xl leading-[0.95] font-bold sm:text-7xl lg:text-8xl">
          Une lumière chaude,
          <br />
          posée chez vous.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-encre/70">
          Des lampes imprimées en 3D, fabriquées à la commande en Algérie.
          Paiement à la livraison, partout au pays.
        </p>
        <a
          href="#creations"
          className="mt-7 inline-block rounded-full bg-lueur px-8 py-3 font-medium text-encre transition hover:bg-lueur/90"
        >
          Découvrir la collection
        </a>
      </div>
    </section>
  );
}
