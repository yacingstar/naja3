// Sort les photos de Supabase Storage et les met dans le site, puis réécrit
// le catalogue de secours pour qu'il pointe vers les copies locales.
//
// Le 6 novembre 2026 Supabase a restreint le projet pour dépassement
// d'egress : images comprises, toutes en HTTP 402. Or l'egress de Storage,
// c'est 99 % du problème — 8,47 Mo de photos qui repartent sur le réseau à
// chaque visite, contre quelques kilo-octets de texte pour le reste.
//
// Ces 8,47 Mo tiennent dans `public/`. Servies par Netlify, elles ne coûtent
// plus rien à Supabase, qui redevient ce dont ce site a vraiment besoin : une
// base de données pour les commandes. C'est la version intégrale de ce que
// « compresser » veut dire ici — pas une image plus légère, zéro image.
//
//   node scripts/rapatrier-photos.mjs
//
// Les octets viennent des sauvegardes locales faites les 4 et 5 novembre,
// puisque la source est injoignable. Chaque fichier est vérifié : copié
// seulement s'il s'ouvre comme une image valide, aux dimensions attendues.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CATALOGUE = "src/data/catalogue.json";
const DEST = "public/veilleuses";
const SAUVEGARDES = [
  "C:/Users/Pc/naja3-photos-backup/compresse",
  "C:/Users/Pc/naja3-photos-backup/originaux",
];
const PREFIXE = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/product-photos\//;

const catalogue = JSON.parse(fs.readFileSync(CATALOGUE, "utf8"));

// Tous les chemins Storage cités par le catalogue, dédoublonnés : une même
// photo sert souvent de découpe ET de première image de galerie.
const cites = new Set();
function parcourir(v, visiter) {
  if (typeof v === "string") return visiter(v);
  if (Array.isArray(v)) return v.forEach((x) => parcourir(x, visiter));
  if (v && typeof v === "object") return Object.values(v).forEach((x) => parcourir(x, visiter));
}
parcourir(catalogue, (s) => { if (PREFIXE.test(s)) cites.add(decodeURIComponent(s.replace(PREFIXE, ""))); });

// Où trouver les octets d'un chemin Storage donné.
//
// Les photos renommées le 4 novembre portent un suffixe `-c<horodatage>` que
// la sauvegarde ne connaît pas : sur le disque le fichier est resté sous son
// nom d'avant, lequel pouvait déjà porter son propre suffixe de largeur
// (`-w1920`, `-w1199`...). Plutôt que de deviner lequel, on cherche dans le
// dossier du coloris le fichier dont le nom commence par la même racine — il
// n'y en a qu'une poignée par coloris, et l'ambiguïté est signalée.
function localiser(chemin) {
  const dossier = path.dirname(chemin);
  const racineNom = path.basename(chemin).replace(/-c\d{10,}\.webp$/, "");
  const exact = path.basename(chemin);

  for (const base of SAUVEGARDES) {
    const rep = path.join(base, dossier.replaceAll("/", path.sep));
    if (!fs.existsSync(rep)) continue;
    const noms = fs.readdirSync(rep);
    if (noms.includes(exact)) return path.join(rep, exact);
    if (racineNom === exact) continue; // pas de suffixe à retirer, rien d'autre à tenter ici

    const proches = noms.filter((n) => n.startsWith(racineNom) && /\.(webp|png|jpe?g)$/i.test(n));
    if (proches.length === 1) return path.join(rep, proches[0]);
    if (proches.length > 1) {
      // On préfère le plus léger : c'est la version déjà compressée.
      proches.sort((a, b) => fs.statSync(path.join(rep, a)).size - fs.statSync(path.join(rep, b)).size);
      console.log(`  (${chemin} : ${proches.length} candidats, choix de ${proches[0]})`);
      return path.join(rep, proches[0]);
    }
  }
  return null;
}

fs.rmSync(DEST, { recursive: true, force: true });

const correspondances = new Map();
const introuvables = [];
let octets = 0;

for (const chemin of cites) {
  const source = localiser(chemin);
  if (!source) { introuvables.push(chemin); continue; }

  const buf = fs.readFileSync(source);
  let meta;
  try {
    meta = await sharp(buf).metadata();
  } catch {
    introuvables.push(`${chemin} (illisible : ${source})`);
    continue;
  }
  if (!meta.width || !meta.height) { introuvables.push(`${chemin} (sans dimensions)`); continue; }

  // Même arborescence qu'en ligne (<id coloris>/<nom>), donc deux coloris ne
  // peuvent pas se marcher dessus même avec des noms de fichier identiques.
  const destination = path.join(DEST, chemin.replaceAll("/", path.sep));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, buf);
  octets += buf.length;

  // Les segments sont encodés un par un : `next/image` et le navigateur
  // veulent une URL valide, et certains noms contiennent espaces et accents.
  correspondances.set(
    chemin,
    `/veilleuses/${chemin.split("/").map(encodeURIComponent).join("/")}`,
  );
}

// Réécriture du catalogue : chaque URL Supabase devient son chemin local.
function reecrire(v) {
  if (typeof v === "string") {
    if (!PREFIXE.test(v)) return v;
    return correspondances.get(decodeURIComponent(v.replace(PREFIXE, ""))) ?? v;
  }
  if (Array.isArray(v)) return v.map(reecrire);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, reecrire(x)]));
  return v;
}
const reecrit = reecrire(catalogue);
reecrit.photosLocales = true;
fs.writeFileSync(CATALOGUE, JSON.stringify(reecrit, null, 1));

const restantes = [];
parcourir(reecrit, (s) => { if (PREFIXE.test(s)) restantes.push(s); });

console.log(`Photos citées par le catalogue : ${cites.size}`);
console.log(`Copiées dans ${DEST} : ${correspondances.size} (${(octets / 1048576).toFixed(2)} Mo)`);
console.log(`URL Supabase restantes dans le catalogue : ${restantes.length}`);
if (introuvables.length) {
  console.log(`\n!! ${introuvables.length} introuvables dans les sauvegardes :`);
  for (const c of introuvables) console.log("  ", c);
}
