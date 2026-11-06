// Reconstruit le catalogue depuis les pages pré-générées de `.next`, sans
// toucher à Supabase.
//
// Écrit le 6 novembre 2026, le jour où Supabase a restreint le projet pour
// dépassement d'egress (HTTP 402 sur tout : REST, Storage, Auth). La boutique
// répondait 200 avec zéro produit et les huit pages produit en 404.
//
// Les pages avaient été pré-générées lors du dernier `npm run build`, avec les
// vraies données : nom, prix, description, coloris, teintes, photos. Tout est
// dans les charges React Server Components (`.next/server/app/**/*.rsc`), qui
// survivent à la panne puisqu'elles sont sur le disque.
//
//   node scripts/extraire-catalogue.mjs
//
// Produit src/data/catalogue.json, la copie de secours que products.ts sert
// quand Supabase ne répond pas.

import fs from "node:fs";
import path from "node:path";

const RACINE = ".next/server/app";
const SORTIE = "src/data/catalogue.json";

// Le flux RSC est une suite de `<id>:<charge>`. Une charge `T<longueur hex>,`
// introduit un bloc de texte brut — les longues descriptions produit — dont la
// longueur est comptée en OCTETS, pas en caractères : d'où le travail sur un
// Buffer plutôt que sur une chaîne, sinon chaque accent décale la suite.
function decouperFlux(buf) {
  const morceaux = {};
  let i = 0;
  while (i < buf.length) {
    const sep = buf.indexOf(0x3a /* : */, i);
    if (sep === -1) break;
    const id = buf.subarray(i, sep).toString("utf8");
    if (buf[sep + 1] === 0x54 /* T */) {
      const virgule = buf.indexOf(0x2c /* , */, sep + 1);
      const longueur = parseInt(buf.subarray(sep + 2, virgule).toString("utf8"), 16);
      const debut = virgule + 1;
      morceaux[id] = buf.subarray(debut, debut + longueur).toString("utf8");
      i = debut + longueur + 1;
    } else {
      const fin = buf.indexOf(0x0a /* \n */, sep + 1);
      const stop = fin === -1 ? buf.length : fin;
      morceaux[id] = buf.subarray(sep + 1, stop).toString("utf8");
      i = stop + 1;
    }
  }
  return morceaux;
}

// Extrait la valeur JSON équilibrée qui commence à `depart`, objet ou tableau,
// en ignorant les délimiteurs situés à l'intérieur d'une chaîne — les
// descriptions produit en contiennent.
function valeurA(texte, depart) {
  const ouvrant = texte[depart];
  const fermant = ouvrant === "[" ? "]" : "}";
  let profondeur = 0, dansChaine = false, echappe = false;
  for (let i = depart; i < texte.length; i++) {
    const c = texte[i];
    if (echappe) { echappe = false; continue; }
    if (c === "\\") { echappe = true; continue; }
    if (c === '"') { dansChaine = !dansChaine; continue; }
    if (dansChaine) continue;
    if (c === ouvrant) profondeur++;
    else if (c === fermant && --profondeur === 0) return texte.slice(depart, i + 1);
  }
  return null;
}

const objetA = valeurA;

// Les textes longs ne sont pas inclus sur place : la charge porte "$21" et le
// bloc 21 contient la description. On les recolle.
function resoudre(valeur, morceaux) {
  if (typeof valeur === "string") {
    const m = /^\$([0-9a-f]+)$/.exec(valeur);
    return m && morceaux[m[1]] !== undefined ? morceaux[m[1]] : valeur;
  }
  if (Array.isArray(valeur)) return valeur.map((v) => resoudre(v, morceaux));
  if (valeur && typeof valeur === "object") {
    return Object.fromEntries(Object.entries(valeur).map(([k, v]) => [k, resoudre(v, morceaux)]));
  }
  return valeur;
}

function chercher(fichier, ancre) {
  if (!fs.existsSync(fichier)) return null;
  const buf = fs.readFileSync(fichier);
  const morceaux = decouperFlux(buf);
  const texte = buf.toString("utf8");
  const i = texte.indexOf(ancre);
  if (i === -1) return null;
  const brut = objetA(texte, i);
  if (!brut) return null;
  try {
    return resoudre(JSON.parse(brut), morceaux);
  } catch {
    return null;
  }
}

// --- Les fiches produit ----------------------------------------------------
const fiches = [];
const dossier = path.join(RACINE, "boutique");
for (const f of fs.readdirSync(dossier).filter((n) => n.endsWith(".rsc"))) {
  const trouve = chercher(path.join(dossier, f), '{"product":{"id":');
  if (!trouve?.product) { console.log("!! illisible :", f); continue; }
  fiches.push({ ...trouve.product, colors: trouve.colors ?? [] });
}
fiches.sort((a, b) => a.id - b.id);

// --- Les cartes (accueil et listing) ---------------------------------------
// Le même objet produit, dans sa forme courte. L'ancre diffère parce que la
// page listing sérialise un tableau de produits, pas un seul.
let cartes = chercher(path.join(RACINE, "boutique.html"), '{"products":[{"id":');
if (!cartes) cartes = chercher(path.join(RACINE, "boutique.rsc"), '{"products":[{"id":');

// --- Les tarifs de livraison ------------------------------------------------
// Les 58 wilayas avec leurs deux prix. Sans eux une commande ne peut pas être
// chiffrée, donc pas passée : c'est la première chose que `placeOrder` va
// chercher en base.
function tarifs() {
  for (const f of ["commande.rsc", "commande.html", "panier.rsc"]) {
    const chemin = path.join(RACINE, f);
    if (!fs.existsSync(chemin)) continue;
    const texte = fs.readFileSync(chemin, "utf8");
    const i = texte.indexOf('[{"wilaya":"');
    if (i === -1) continue;
    const brut = valeurA(texte, i);
    if (!brut) continue;
    try {
      const liste = JSON.parse(brut);
      if (Array.isArray(liste) && liste.length > 40) return liste;
    } catch { /* on essaie le fichier suivant */ }
  }
  return null;
}
const livraison = tarifs();

const catalogue = {
  genereLe: new Date().toISOString(),
  source: "pages pré-générées de .next, catalogue du 2026-11-04",
  produits: fiches,
  cartes: cartes?.products ?? null,
  livraison,
};

fs.mkdirSync(path.dirname(SORTIE), { recursive: true });
fs.writeFileSync(SORTIE, JSON.stringify(catalogue, null, 1));

console.log(`Fiches produit : ${fiches.length}`);
for (const p of fiches) {
  const photos = p.colors.reduce((s, c) => s + (c.photos?.length ?? 0), 0);
  console.log(`  ${String(p.slug).padEnd(12)} ${String(p.price).padStart(5)} DA  ${p.colors.length} coloris  ${photos} photos  desc ${String(p.description).length} car.`);
}
console.log(`Cartes : ${cartes?.products?.length ?? "ABSENTES"}`);
console.log(`Wilayas : ${livraison?.length ?? "ABSENTES"}`);
console.log(`Écrit dans ${SORTIE}`);
