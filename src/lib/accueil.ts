// The homepage's own small vocabulary: the customer photographs that live in
// `public/retours/`, and the shape of a coloris once it reaches the client.
//
// These photographs are served by Netlify, deliberately NOT from Supabase
// Storage. The shop was restricted for cached egress in September; a wall of
// twelve testimonial photos on the busiest page would have gone straight back
// into that bill for no reason — they never change, so the CDN is where they
// belong.
//
// Only the words the customers actually wrote are quoted. A photo with no
// message carries none: an invented testimonial would undo the very trust
// these are here to build. Two customers' Instagram handles were blurred out
// of the images before they were added — a private account does not go on a
// commercial page without being asked.
export type Retour = {
  src: string;
  alt: string;
  /** Empty when the customer sent a photo but no words. */
  quote: string;
};

export const RETOURS: Retour[] = [
  {
    src: "/retours/avis10.webp",
    alt: "Une veilleuse rose allumée dans un salon, près de la télévision",
    quote:
      "Franchement, elle est juste formidable ! Elle crée une ambiance tellement douce et chaleureuse, parfaite pour se détendre après une longue journée. Merci pour cette pépite.",
  },
  {
    src: "/retours/avis8.webp",
    alt: "Un Champignon rouge allumé devant une étagère",
    quote: "J'ai reçu ma commande et j'ADORE, franchement c'est magnifique. Yaatik esaha.",
  },
  {
    src: "/retours/avis3.webp",
    alt: "Une Akari bleu nuit sur un bureau, à côté de figurines",
    quote: "C'est bon bien reçu, et c'est parfait, ya3tikom sa7a.",
  },
  { src: "/retours/avis1.webp", alt: "Un Champignon qui baigne un coin de salon de rouge", quote: "" },
  { src: "/retours/avis6.webp", alt: "Un Champignon vert allumé sur un bureau", quote: "" },
  { src: "/retours/avis7.webp", alt: "Une veilleuse rose dans un coin gaming", quote: "" },
  { src: "/retours/avis9.webp", alt: "Un Champignon jaune allumé, mur orangé", quote: "" },
  { src: "/retours/avis11.webp", alt: "Un Champignon orange devant une bibliothèque", quote: "" },
  { src: "/retours/avis0.webp", alt: "Une Akari blanche et bleu nuit sur une table de chevet", quote: "" },
  { src: "/retours/avis2.webp", alt: "Une Akari vert d'eau sur une coiffeuse", quote: "" },
  { src: "/retours/avis4.webp", alt: "Un Champignon blanc allumé sur une étagère", quote: "" },
  { src: "/retours/avis5.webp", alt: "Une Akari rouge allumée dans une niche en bois", quote: "" },
];

// ─── couleur ────────────────────────────────────────────────────────────

function channels(hex: string): [number, number, number] {
  const raw = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16));
  return [r, g, b];
}

/** A pale version of a hue, for the page's own backgrounds. */
export function pale(hex: string | null): string {
  const [r, g, b] = channels(hex ?? "#e5d9cf").map((v) => Math.round(v + (255 - v) * 0.78));
  return `rgb(${r},${g},${b})`;
}

/**
 * Dark ink on light fills, paper on dark ones — the same luminance test the
 * catalogue chips already use, so no combination of hue and text ever lands
 * below the contrast floor.
 */
export function inkOn(colour: string): string {
  const nums = colour.startsWith("#")
    ? channels(colour)
    : (colour.replace(/[^0-9,]/g, "").split(",").map(Number) as [number, number, number]);
  const lin = nums.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  return lum > 0.5 ? "#241c21" : "#fffdf7";
}

/** Hue in degrees, or -1 for a grey where hue carries no meaning. */
export function hue(hex: string | null): number {
  const [r, g, b] = channels(hex ?? "#e5d9cf").map((v) => v / 255);
  const mx = Math.max(r, g, b);
  const d = mx - Math.min(r, g, b);
  if (d === 0) return -1;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (Math.round(h * 60) + 360) % 360;
}
