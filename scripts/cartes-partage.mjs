// Fabrique les images qui s'affichent quand un lien du site est collé dans un
// message privé, une story, WhatsApp ou Facebook — une par produit, plus une
// pour le site lui-même.
//
//   npm run partage:cartes
//
// ── Pourquoi des fichiers et pas la photo du produit directement ────────────
//
// Les photos du catalogue sont toutes en .webp (bucket `product-photos`), et
// les aperçus de lien ne s'entendent pas sur ce format : la documentation de
// WhatsApp ne parle que de poids et de proportions, les guides se contredisent
// sur le format, et on trouve des rapports d'images refusées avec « could not
// be processed as an image ». Le .jpeg, lui, marche partout. Ce script
// re-encode donc chaque visuel une fois pour toutes.
//
// Deux autres raisons de passer par un fichier préparé :
//   • Les découpes du catalogue sont sur fond TRANSPARENT. Un aperçu de lien
//     compose sur du noir quand il ne sait pas quoi faire de la transparence :
//     la veilleuse ivoire devenait un objet sombre sur fond sombre.
//   • Les proportions. WhatsApp veut au moins 300 px de large et un rapport
//     d'au plus 4:1 ; 1200 × 630 est ce que Facebook et Instagram attendent.
//     Une photo carrée de 900 px se faisait recadrer n'importe comment.
//
// ── Ce que ce script NE fait pas ─────────────────────────────────────────────
//
// Il ne se relance pas tout seul. Changer la photo d'une veilleuse dans
// l'admin ne met pas sa carte à jour — il faut relancer ce script et déployer.
// C'est assumé : une carte montre l'objet, et l'objet ne change pas quand on
// remplace une photo par une autre du même objet. Un produit AJOUTÉ depuis,
// lui, n'a pas de carte et retombe sur celle du site (voir le repli dans
// src/app/(site)/boutique/[slug]/page.tsx) : un lien partagé n'est donc jamais
// nu, même oublié ici.
//
// La clé publique Supabase est lue depuis Netlify au lancement, jamais écrite
// sur le disque. C'est la clé `NEXT_PUBLIC_*`, celle qui part déjà dans le
// navigateur de toutes les visiteuses — aucun secret ne transite ici.

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

// 1200 × 630, le format que Facebook, Instagram et WhatsApp attendent.
const LARGEUR = 1200;
const HAUTEUR = 630;
// Le fond du site (--papier dans globals.css). Les découpes sont
// transparentes : sans ce fond, l'aperçu les compose sur du noir.
const PAPIER = { r: 0xff, g: 0xf6, b: 0xee };
// Une marge franche : l'objet doit survivre au recadrage carré que certaines
// applications appliquent à la vignette.
const MARGE = 56;
// Au-delà, WhatsApp n'affiche plus rien. On vise très en dessous.
const POIDS_MAX = 600 * 1024;

const RACINE = path.resolve(import.meta.dirname, "..");
const SORTIE = path.join(RACINE, "public", "og");

// Les horloges n'ont aucune photo : elles n'existent qu'en modèle 3D, et leurs
// visuels sont des rendus tirés du .glb (voir src/lib/horloges.ts). On prend le
// coloris que la patronne a mis en premier dans ses idées.
const RENDUS_HORLOGE = {
  "horloge-tele": "tele-originale.webp",
  "horloge-duo": "duo-foret.webp",
};

function depuisNetlify(nom) {
  try {
    const valeur = execSync(`netlify env:get ${nom}`, {
      cwd: RACINE,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    // `netlify env:get` imprime parfois une ligne d'en-tête avant la valeur.
    return valeur.trim().split("\n").pop().trim();
  } catch {
    return "";
  }
}

const URL_BASE =
  process.env.NEXT_PUBLIC_SUPABASE_URL || depuisNetlify("NEXT_PUBLIC_SUPABASE_URL");
const CLE =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  depuisNetlify("NEXT_PUBLIC_SUPABASE_ANON_KEY");

if (!URL_BASE || !CLE) {
  console.error(
    "Supabase introuvable. Lancer depuis le dossier du projet (la clé est lue\n" +
      "depuis Netlify), ou fournir NEXT_PUBLIC_SUPABASE_URL et\n" +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY dans l'environnement.",
  );
  process.exit(1);
}

const SELECT =
  "slug,name,preview,product_colors(in_stock,cutout_photo_url,product_photos(url,position))";

async function lireCatalogue() {
  const r = await fetch(`${URL_BASE}/rest/v1/products?select=${SELECT}`, {
    headers: { apikey: CLE, Authorization: `Bearer ${CLE}` },
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

// La même règle que cardPhotoUrl dans src/lib/products.ts : la découpe du
// coloris en stock, sinon sa première photo de galerie. Dupliquée ici parce
// qu'un script .mjs ne peut pas importer le TypeScript de l'application ; si
// la règle change là-bas, elle ne change pas ici, et le pire qui arrive est
// une carte qui montre un autre coloris du même objet.
function photoProduit(produit) {
  const coloris =
    produit.product_colors?.find((c) => c.in_stock) ?? produit.product_colors?.[0];
  if (!coloris) return null;
  if (coloris.cutout_photo_url) return coloris.cutout_photo_url;
  const photos = (coloris.product_photos ?? [])
    .slice()
    .sort((a, b) => a.position - b.position);
  return photos[0]?.url ?? null;
}

// Le catalogue mélange DEUX endroits où vivent les photos, et il faut le
// savoir pour lire une URL de la base :
//
//   • « https://…supabase.co/storage/v1/object/public/product-photos/… »
//     pour ce qui a été chargé depuis l'admin (ondine, et tout ce qui sera
//     ajouté désormais) ;
//   • « /veilleuses/10/cutout-….webp » — un chemin RELATIF, servi depuis
//     public/ du dépôt, pour les huit veilleuses d'avant la bascule (voir
//     scripts/rapatrier-photos.mjs).
//
// Les deux formes sont valides dans une page web, où « /veilleuses/… » se
// résout contre le domaine. Ici on lit des fichiers, donc le chemin relatif se
// résout contre public/.
function resoudre(source) {
  if (source.startsWith("http")) return source;
  return path.join(RACINE, "public", source);
}

async function octets(source) {
  if (source.startsWith("http")) {
    const r = await fetch(source);
    if (!r.ok) throw new Error(`${r.status} sur ${source}`);
    return Buffer.from(await r.arrayBuffer());
  }
  return fs.readFileSync(source);
}

// Un ou deux objets posés sur le papier du site, au centre, sans texte.
//
// Sans texte volontairement : sharp rend le texte en passant par du SVG, donc
// par les polices INSTALLÉES sur la machine qui lance le script — ce qui donne
// une carte différente d'un ordinateur à l'autre, et sans rapport avec les
// polices du site. Les mots du partage sont portés par `og:title` et
// `og:description`, que l'application écrit (voir la fiche produit) ; l'image
// ne porte que l'objet.
async function carte(sources, fichier) {
  const largeurUtile = LARGEUR - MARGE * 2;
  const hauteurUtile = HAUTEUR - MARGE * 2;
  // Deux objets se partagent la largeur, avec un intervalle entre eux.
  const caseLargeur =
    sources.length > 1
      ? Math.floor((largeurUtile - MARGE) / sources.length)
      : largeurUtile;

  const calques = [];
  for (const [index, source] of sources.entries()) {
    const image = await sharp(await octets(source))
      .resize({
        width: caseLargeur,
        height: hauteurUtile,
        fit: "contain",
        background: { ...PAPIER, alpha: 0 },
      })
      .toBuffer();
    calques.push({
      input: image,
      left: MARGE + index * (caseLargeur + MARGE),
      top: MARGE,
    });
  }

  const sortie = path.join(SORTIE, fichier);
  await sharp({
    create: { width: LARGEUR, height: HAUTEUR, channels: 3, background: PAPIER },
  })
    .composite(calques)
    .jpeg({ quality: 82, chromaSubsampling: "4:4:4" })
    .toFile(sortie);

  const poids = fs.statSync(sortie).size;
  const alerte = poids > POIDS_MAX ? "  ⚠ trop lourde pour WhatsApp" : "";
  console.log(`  ${fichier.padEnd(26)} ${(poids / 1024).toFixed(0)} Ko${alerte}`);
  return poids <= POIDS_MAX;
}

fs.mkdirSync(SORTIE, { recursive: true });

const catalogue = await lireCatalogue();
console.log(`${catalogue.length} produits au catalogue.\n`);

const avecCarte = [];
let faites = 0;
let ratees = 0;
// La carte du site montre les deux gammes, comme l'accueil : une veilleuse et
// une horloge côte à côte. On garde la première de chaque pour la composer.
let veilleuse = null;
let horloge = null;

for (const produit of catalogue) {
  const brut = produit.preview
    ? RENDUS_HORLOGE[produit.slug] && `/horloges/${RENDUS_HORLOGE[produit.slug]}`
    : photoProduit(produit);
  const source = brut ? resoudre(brut) : null;

  if (!source || (!source.startsWith("http") && !fs.existsSync(source))) {
    console.log(`  ${produit.slug.padEnd(26)} — aucun visuel, ignoré`);
    ratees += 1;
    continue;
  }

  if (produit.preview) horloge ??= source;
  else veilleuse ??= source;

  try {
    await carte([source], `${produit.slug}.jpg`);
    avecCarte.push(produit.slug);
    faites += 1;
  } catch (erreur) {
    console.log(`  ${produit.slug.padEnd(26)} — échec : ${erreur.message}`);
    ratees += 1;
  }
}

// ── La liste, pour que l'application sache ce qui existe ────────────────────
//
// Les pages ont besoin de savoir si un produit a sa carte, et elles ne peuvent
// pas aller regarder sur le disque : elles tournent dans une fonction Netlify
// où public/ n'est pas lisible. D'où ce module écrit ici et versionné à côté
// des images. S'il manque, le build échoue bruyamment plutôt que de servir des
// liens nus en silence.
function ecrireListe(slugs) {
  const lignes = slugs.map((slug) => `  "${slug}",`).join("\n");
  const fichier = path.join(RACINE, "src", "lib", "cartesPartage.ts");
  fs.writeFileSync(
    fichier,
    `// ÉCRIT PAR scripts/cartes-partage.mjs — ne pas modifier à la main.
//
// Les produits qui ont leur image d'aperçu dans public/og. Un produit absent
// de cette liste retombe sur la carte du site : un lien partagé montre alors
// les deux gammes plutôt que rien du tout.
//
// Dernière génération : ${new Date().toISOString().slice(0, 10)}

const AVEC_CARTE = new Set([
${lignes}
]);

/** L'image à annoncer pour ce produit, toujours un chemin servi par le site. */
export function cartePartage(slug: string): string {
  return AVEC_CARTE.has(slug) ? \`/og/\${slug}.jpg\` : "/og/naja.jpg";
}
`,
    "utf8",
  );
  console.log(`\nsrc/lib/cartesPartage.ts : ${slugs.length} produits listés.`);
}

if (veilleuse && horloge) {
  console.log("");
  await carte([veilleuse, horloge], "naja.jpg");
  faites += 1;
} else if (veilleuse) {
  console.log("\n(une seule gamme trouvée, la carte du site ne montre qu'elle)");
  await carte([veilleuse], "naja.jpg");
  faites += 1;
}

ecrireListe(avecCarte);

console.log(`\n${faites} cartes écrites dans public/og${ratees ? `, ${ratees} sans visuel` : ""}.`);
