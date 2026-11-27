// Met à jour la grille de livraison des 58 wilayas.
//
//   npm run tarifs:verifier    # montre ce qui changerait, sans rien écrire
//   npm run tarifs:appliquer   # écrit en base
//
// Source : « Tarifs de livraison — les 58 wilayas, prix payés par la
// cliente », transporteur Anderson E-Commerce, document daté du 27 novembre
// 2026 fourni par la patronne. Les montants ci-dessous ont été lus deux fois
// et de deux façons — décodés depuis le texte du PDF, puis recoupés à l'œil
// sur le document affiché — parce qu'un chiffre faux ici est un chiffre que
// la cliente paie.
//
// La clé service_role est lue depuis Netlify au lancement, jamais écrite sur
// le disque : la table `delivery_rates` est publique en lecture mais fermée
// en écriture, et c'est très bien ainsi.
//
// ── Après avoir écrit ───────────────────────────────────────────────────────
// Les fiches produit sont prérendues avec `revalidate = 300`. Les nouveaux
// tarifs apparaissent donc dans les cinq minutes, ou tout de suite si l'admin
// enregistre quoi que ce soit (revalidatePath). Il faut aussi penser à la
// copie de secours dans src/lib/catalogueSecours.ts, qui sert quand Supabase
// ne répond pas — ce script la réécrit avec `--secours`.

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const RACINE = path.resolve(import.meta.dirname, "..");
const POUR_DE_VRAI = process.argv.includes("--appliquer");
const ECRIRE_SECOURS = process.argv.includes("--secours");

// numéro de wilaya → [bureau, domicile], en dinars.
// « Bureau » = retrait à l'agence du transporteur (stopdesk dans la base).
const TARIFS = {
  "01": [850, 1650],
  "02": [450, 700],
  "03": [450, 850],
  "04": [450, 850],
  "05": [450, 850],
  "06": [450, 850],
  "07": [650, 850],
  "08": [650, 1200],
  "09": [400, 650],
  10: [450, 650],
  11: [1000, 1800],
  12: [450, 850],
  13: [450, 850],
  14: [450, 850],
  15: [450, 650],
  16: [500, 500],
  17: [450, 850],
  18: [450, 850],
  19: [450, 850],
  20: [450, 850],
  21: [450, 850],
  22: [450, 850],
  23: [450, 850],
  24: [450, 850],
  25: [450, 850],
  26: [450, 650],
  27: [450, 850],
  28: [450, 850],
  29: [450, 850],
  30: [500, 1000],
  31: [450, 850],
  32: [450, 850],
  33: [850, 1700],
  34: [450, 650],
  35: [400, 650],
  36: [550, 850],
  37: [700, 1650],
  38: [450, 850],
  39: [600, 950],
  40: [450, 850],
  41: [450, 850],
  42: [450, 650],
  43: [450, 850],
  44: [450, 650],
  45: [500, 950],
  46: [450, 850],
  47: [650, 950],
  48: [450, 850],
  49: [850, 1650],
  50: [1200, 2000],
  51: [450, 950],
  52: [650, 1300],
  53: [850, 1650],
  54: [1200, 2000],
  55: [500, 950],
  56: [1000, 2000],
  57: [500, 950],
  58: [450, 750],
};

function cleService() {
  for (const commande of [
    "netlify env:get SUPABASE_SERVICE_ROLE_KEY",
    "npx --no-install netlify env:get SUPABASE_SERVICE_ROLE_KEY",
  ]) {
    try {
      const sortie = execSync(commande, {
        cwd: RACINE,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const valeur = sortie.trim().split("\n").pop().trim();
      if (valeur && valeur.length > 20) return valeur;
    } catch {
      /* on essaie la suivante */
    }
  }
  return "";
}

function clePublique() {
  try {
    return execSync("netlify env:get NEXT_PUBLIC_SUPABASE_ANON_KEY", {
      cwd: RACINE,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .trim()
      .split("\n")
      .pop()
      .trim();
  } catch {
    return "";
  }
}

function urlBase() {
  try {
    return execSync("netlify env:get NEXT_PUBLIC_SUPABASE_URL", {
      cwd: RACINE,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .trim()
      .split("\n")
      .pop()
      .trim();
  } catch {
    return "";
  }
}

const URL_BASE = process.env.SUPABASE_URL || urlBase();
const CLE_LECTURE = clePublique();
if (!URL_BASE || !CLE_LECTURE) {
  console.error("Supabase introuvable — lancer depuis le dossier du projet.");
  process.exit(1);
}

async function rest(chemin, cle, options = {}) {
  const r = await fetch(`${URL_BASE}/rest/v1/${chemin}`, {
    ...options,
    headers: {
      apikey: cle,
      Authorization: `Bearer ${cle}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers ?? {}),
    },
  });
  const texte = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${chemin} — ${texte.slice(0, 300)}`);
  return texte ? JSON.parse(texte) : null;
}

const actuels = await rest(
  "delivery_rates?select=wilaya,domicile_price,stopdesk_price&order=wilaya",
  CLE_LECTURE,
);

const changements = [];
const inconnus = [];
for (const ligne of actuels) {
  const numero = ligne.wilaya.slice(0, 2);
  const cible = TARIFS[numero] ?? TARIFS[String(Number(numero))];
  if (!cible) {
    inconnus.push(ligne.wilaya);
    continue;
  }
  const [bureau, domicile] = cible;
  if (ligne.stopdesk_price !== bureau || ligne.domicile_price !== domicile) {
    changements.push({
      wilaya: ligne.wilaya,
      avant: [ligne.stopdesk_price, ligne.domicile_price],
      apres: [bureau, domicile],
    });
  }
}

console.log(`${actuels.length} wilayas en base, ${changements.length} à modifier.\n`);
for (const c of changements) {
  const [ab, ad] = c.avant;
  const [nb, nd] = c.apres;
  const fl = (a, b) => (a === b ? "   =" : b > a ? ` +${b - a}` : ` ${b - a}`);
  console.log(
    `  ${c.wilaya.padEnd(22)} bureau ${String(ab).padStart(4)} → ${String(nb).padStart(4)}${fl(ab, nb)}` +
      `   domicile ${String(ad).padStart(4)} → ${String(nd).padStart(4)}${fl(ad, nd)}`,
  );
}
if (inconnus.length) console.log(`\n⚠ sans correspondance : ${inconnus.join(", ")}`);

if (ECRIRE_SECOURS) {
  // La copie figée qui sert quand Supabase ne répond pas (voir
  // catalogueSecours.ts, qui la lit). Sans ça, une panne Supabase ferait
  // payer les anciens tarifs — et la grille de secours est précisément celle
  // qu'on consulte le jour où plus rien d'autre ne répond.
  const fichier = path.join(RACINE, "src", "data", "catalogue.json");
  const brut = fs.readFileSync(fichier, "utf8");
  const catalogue = JSON.parse(brut);
  let touchees = 0;
  for (const entree of catalogue.livraison ?? []) {
    const numero = entree.wilaya.slice(0, 2);
    const cible = TARIFS[numero] ?? TARIFS[String(Number(numero))];
    if (!cible) continue;
    const [bureau, domicile] = cible;
    if (entree.domicilePrice !== domicile || entree.stopdeskPrice !== bureau) touchees += 1;
    entree.domicilePrice = domicile;
    entree.stopdeskPrice = bureau;
  }
  // Même mise en forme que le fichier existant, pour que le diff ne montre
  // que les montants.
  const finDeLigne = brut.includes("\r\n") ? "\r\n" : "\n";
  const texte = JSON.stringify(catalogue, null, 1).split("\n").join(finDeLigne);
  fs.writeFileSync(fichier, texte + (brut.endsWith("\n") ? finDeLigne : ""));
  console.log(`\nsrc/data/catalogue.json : ${touchees} wilayas réécrites.`);
}

if (!POUR_DE_VRAI) {
  console.log("\n(lecture seule — relancer avec --appliquer pour écrire)");
  process.exit(0);
}

if (changements.length === 0) {
  console.log("\nRien à écrire.");
  process.exit(0);
}

const CLE_ECRITURE = cleService();
if (!CLE_ECRITURE) {
  console.error(
    "\nClé service_role introuvable. `netlify status` doit fonctionner dans ce dossier.",
  );
  process.exit(1);
}

let faits = 0;
for (const c of changements) {
  const [bureau, domicile] = c.apres;
  await rest(`delivery_rates?wilaya=eq.${encodeURIComponent(c.wilaya)}`, CLE_ECRITURE, {
    method: "PATCH",
    body: JSON.stringify({ domicile_price: domicile, stopdesk_price: bureau }),
  });
  faits += 1;
}
console.log(`\n${faits} wilayas mises à jour en base.`);
