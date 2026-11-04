// Supprime du bucket `product-photos` tout fichier qu'aucune ligne de la base
// ne référence plus.
//
// Pourquoi ce script existe : en novembre 2026, 81 fichiers sur 180 (100 Mo
// sur 178) n'étaient plus reliés à rien — d'anciennes photos remplacées au fil
// des mois, à une époque où l'admin ne nettoyait pas derrière elle. Elle le
// fait aujourd'hui (voir uploadCutoutPhoto et deletePhoto), donc ce script est
// un coup de balai ponctuel, pas une tâche récurrente. Il reste là parce qu'il
// est sûr à relancer : s'il n'y a rien à supprimer, il ne supprime rien.
//
//   netlify env:get SUPABASE_SERVICE_ROLE_KEY > cle.txt
//   SBKEY=cle.txt node scripts/nettoyer-photos.mjs          # liste seulement
//   SBKEY=cle.txt node scripts/nettoyer-photos.mjs --vraiment # supprime
//
// Deux garde-fous, dans cet ordre :
//   1. la liste des fichiers vivants est relue dans la base À L'INSTANT, pas
//      dans un fichier préparé plus tôt ;
//   2. chaque fichier est téléchargé et vérifié octet par octet dans
//      SAUVEGARDE avant que la moindre suppression ne parte. Si un seul
//      téléchargement échoue, rien n'est supprimé.
//
// Attention au cache : les pages boutique sont prérendues avec
// `revalidate = 300`. Si des lignes viennent d'être repointées, le HTML en
// ligne peut encore citer les anciennes URLs pendant cinq minutes — les
// supprimer dans cette fenêtre casse les photos du site. Vérifier d'abord que
// najadz.com sert bien les nouvelles URLs.

import fs from "node:fs";
import path from "node:path";

const URL_BASE = process.env.SUPABASE_URL ?? "https://zmtdjmadsrxtmovgbrla.supabase.co";
const BUCKET = "product-photos";
const SAUVEGARDE = process.env.SAUVEGARDE ?? "C:/Users/Pc/naja3-photos-backup/supprimes";
const POUR_DE_VRAI = process.argv.includes("--vraiment");

const cleFichier = process.env.SBKEY;
if (!cleFichier || !fs.existsSync(cleFichier)) {
  console.error("SBKEY doit pointer vers un fichier contenant la clé service_role.");
  process.exit(1);
}
const cle = fs.readFileSync(cleFichier, "utf8").trim();
const entetes = { apikey: cle, Authorization: `Bearer ${cle}` };
const json = { ...entetes, "Content-Type": "application/json" };
const PREFIXE = `${URL_BASE}/storage/v1/object/public/${BUCKET}/`;
const encoder = (p) => p.split("/").map(encodeURIComponent).join("/");
const mo = (n) => (n / 1048576).toFixed(2);

async function lister(prefix = "", acc = []) {
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${URL_BASE}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
    });
    const lot = await res.json();
    if (!Array.isArray(lot)) throw new Error(`list: ${JSON.stringify(lot)}`);
    for (const item of lot) {
      const chemin = prefix ? `${prefix}/${item.name}` : item.name;
      // Un `id` nul désigne un dossier, pas un fichier.
      if (item.id === null) await lister(chemin, acc);
      else acc.push({ chemin, taille: item.metadata?.size ?? 0 });
    }
    if (lot.length < 1000) break;
  }
  return acc;
}

const tout = await lister();

// --- Garde-fou 1 : ce que la base utilise, lu maintenant -------------------
const req = async (p) => (await fetch(`${URL_BASE}/rest/v1/${p}`, { headers: json })).json();
const photos = await req("product_photos?select=url");
const coloris = await req("product_colors?select=cutout_photo_url");
const urls = [...photos.map((r) => r.url), ...coloris.map((r) => r.cutout_photo_url)].filter(Boolean);

const horsBucket = urls.filter((u) => !u.startsWith(PREFIXE));
if (horsBucket.length) {
  console.error("Des URLs pointent hors du bucket, on s'arrête :", horsBucket);
  process.exit(1);
}
const vivants = new Set(urls.map((u) => decodeURIComponent(u.slice(PREFIXE.length))));

const cible = tout.filter((o) => !vivants.has(o.chemin));
const poidsTotal = tout.reduce((s, o) => s + o.taille, 0);
const poidsCible = cible.reduce((s, o) => s + o.taille, 0);

console.log(`Bucket      : ${tout.length} fichiers, ${mo(poidsTotal)} Mo`);
console.log(`Utilisés    : ${vivants.size} fichiers`);
console.log(`Inutilisés  : ${cible.length} fichiers, ${mo(poidsCible)} Mo`);
console.log(`Après       : ${tout.length - cible.length} fichiers, ${mo(poidsTotal - poidsCible)} Mo`);

const manquants = [...vivants].filter((v) => !tout.some((o) => o.chemin === v));
if (manquants.length) {
  console.error(`\n${manquants.length} lignes pointent vers un fichier absent — à régler d'abord :`);
  for (const m of manquants) console.error("  ", m);
  process.exit(1);
}
if (!cible.length) {
  console.log("\nRien à supprimer.");
  process.exit(0);
}
if (!POUR_DE_VRAI) {
  console.log("\n(simulation — relancer avec --vraiment pour supprimer)");
  for (const o of [...cible].sort((a, b) => b.taille - a.taille).slice(0, 20)) {
    console.log(`  ${mo(o.taille).padStart(7)} Mo  ${o.chemin}`);
  }
  process.exit(0);
}

// --- Garde-fou 2 : tout sauvegarder avant de supprimer quoi que ce soit ----
let sauves = 0;
for (const o of cible) {
  const dest = path.join(SAUVEGARDE, o.chemin.replaceAll("/", path.sep));
  if (fs.existsSync(dest) && fs.statSync(dest).size === o.taille) { sauves++; continue; }
  const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${encoder(o.chemin)}`, { headers: entetes });
  if (!res.ok) { console.error("Téléchargement échoué, rien ne sera supprimé :", o.chemin, res.status); process.exit(1); }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length !== o.taille) { console.error("Taille inattendue, rien ne sera supprimé :", o.chemin); process.exit(1); }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  sauves++;
}
console.log(`\nSauvegardés dans ${SAUVEGARDE} : ${sauves}/${cible.length}`);
if (sauves !== cible.length) process.exit(1);

for (let i = 0; i < cible.length; i += 50) {
  const lot = cible.slice(i, i + 50).map((o) => o.chemin);
  const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: json,
    body: JSON.stringify({ prefixes: lot }),
  });
  if (!res.ok) { console.error("Suppression échouée :", res.status, await res.text()); process.exit(1); }
  console.log(`  supprimés ${Math.min(i + 50, cible.length)}/${cible.length}`);
}

const apres = await lister();
console.log(`\nBucket : ${apres.length} fichiers, ${mo(apres.reduce((s, o) => s + o.taille, 0))} Mo`);
