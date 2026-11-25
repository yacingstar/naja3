// ÉCRIT PAR scripts/cartes-partage.mjs — ne pas modifier à la main.
//
// Les produits qui ont leur image d'aperçu dans public/og. Un produit absent
// de cette liste retombe sur la carte du site : un lien partagé montre alors
// les deux gammes plutôt que rien du tout.
//
// Dernière génération : 2026-11-25

const AVEC_CARTE = new Set([
  "akari",
  "japandi",
  "champignon",
  "capricorne",
  "nami",
  "origami",
  "nomura",
  "okasa",
  "ondine",
  "horloge-tele",
]);

/** L'image à annoncer pour ce produit, toujours un chemin servi par le site. */
export function cartePartage(slug: string): string {
  return AVEC_CARTE.has(slug) ? `/og/${slug}.jpg` : "/og/naja.jpg";
}
