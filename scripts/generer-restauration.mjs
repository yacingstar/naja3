// Fabrique UN fichier SQL qui reconstruit la boutique entière dans un projet
// Supabase neuf : structure, sécurité, catalogue, coloris, photos, tarifs.
//
// Pourquoi : le 6 novembre 2026 Supabase a restreint le projet pour
// dépassement d'egress. Les 186 commandes ne sont pas perdues — elles sont
// illisibles tant que le compteur n'est pas reparti, pas effacées — mais
// l'admin, lui, est inutilisable en attendant. Ce fichier permet de repartir
// sur un projet gratuit neuf tout de suite, sans rien payer, et de rapatrier
// les anciennes commandes plus tard quand l'ancien projet se rouvrira.
//
//   node scripts/generer-restauration.mjs
//
// Puis coller supabase/restauration.sql dans l'éditeur SQL du NOUVEAU projet.
// Un seul clic : rien à installer, aucune clé à se transmettre.
//
// Deux précautions qui comptent pour la suite :
//
//   1. Les identifiants d'origine sont conservés (okasa = 23, son bleu = 87…).
//      catalogue.json et les commandes déjà passées s'y réfèrent ; les laisser
//      se réattribuer tout seuls ferait pointer d'anciennes lignes vers les
//      mauvaises veilleuses.
//   2. Le compteur des commandes démarre à 1000. Les 186 anciennes portent les
//      numéros 1 à 186 : en laissant les nouvelles commencer à 1, on
//      fabriquerait une collision frontale le jour de la réimportation.

import fs from "node:fs";
import path from "node:path";

const MIGRATIONS = "supabase/migrations";
const CATALOGUE = "src/data/catalogue.json";
const SORTIE = "supabase/restauration.sql";
const PREMIERE_COMMANDE = 1000;

const cat = JSON.parse(fs.readFileSync(CATALOGUE, "utf8"));

const txt = (v) => (v == null ? "NULL" : `'${String(v).replaceAll("'", "''")}'`);
const num = (v) => (v == null ? "NULL" : String(v));
const bool = (v) => (v ? "true" : "false");

const morceaux = [];
const dire = (s) => morceaux.push(s);

dire(`-- Restauration complète de la boutique Naja
-- Généré le ${new Date().toISOString()} par scripts/generer-restauration.mjs
--
-- À coller dans l'éditeur SQL d'un projet Supabase NEUF, puis « Run ».
-- Ne rien exécuter là-dessus sur un projet qui contient déjà des commandes.
--
-- Ce fichier ne contient AUCUNE commande et AUCUNE donnée de cliente : il
-- reconstruit la boutique, pas l'historique. Les 186 commandes de l'ancien
-- projet se réimportent séparément, une fois celui-ci rouvert.

begin;
`);

// --- 1. La structure, dans l'ordre des migrations --------------------------
const fichiers = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
for (const f of fichiers) {
  dire(`\n-- ─────────────────────────────────────────────────────────────`);
  dire(`-- ${f}`);
  dire(`-- ─────────────────────────────────────────────────────────────`);
  dire(fs.readFileSync(path.join(MIGRATIONS, f), "utf8").trimEnd());
}

// --- 2. Les tarifs de livraison --------------------------------------------
const tarifs = cat.livraison ?? [];
dire(`\n\n-- ═════════════════════════════════════════════════════════════`);
dire(`-- Tarifs de livraison — ${tarifs.length} wilayas`);
dire(`-- ═════════════════════════════════════════════════════════════`);
for (const t of tarifs) {
  dire(
    `insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values (${txt(t.wilaya)}, ${num(t.domicilePrice)}, ${num(t.stopdeskPrice)}) on conflict (wilaya) do nothing;`,
  );
}

// --- 3. Le catalogue --------------------------------------------------------
// `overriding system value` est obligatoire : la colonne est en
// `generated always as identity`, donc Postgres refuse un id fourni sans
// cette mention. C'est exactement ce qu'on veut ici — garder les identifiants
// d'origine — et c'est pourquoi les séquences sont recalées juste après.
const produits = cat.produits ?? [];
dire(`\n\n-- ═════════════════════════════════════════════════════════════`);
dire(`-- Catalogue — ${produits.length} veilleuses`);
dire(`-- Les photos pointent vers /veilleuses/… : elles sont servies par`);
dire(`-- Netlify depuis public/, plus par Supabase Storage. C'est ce qui`);
dire(`-- empêche l'egress de repartir comme avant.`);
dire(`-- ═════════════════════════════════════════════════════════════`);

for (const p of produits) {
  dire(`\n-- ${p.name}`);
  dire(
    `insert into public.products (id, slug, name, description, price) overriding system value values (${num(p.id)}, ${txt(p.slug)}, ${txt(p.name)}, ${txt(p.description)}, ${num(p.price)});`,
  );
  for (const c of p.colors ?? []) {
    dire(
      `insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (${num(c.id)}, ${num(p.id)}, ${txt(c.colorName)}, ${txt(c.colorHex)}, ${txt(c.colorHex2)}, ${bool(c.inStock)}, ${txt(c.cutoutPhotoUrl)});`,
    );
    for (const ph of c.photos ?? []) {
      dire(
        `insert into public.product_photos (product_color_id, url, position) values (${num(c.id)}, ${txt(ph.url)}, ${num(ph.position)});`,
      );
    }
  }
}

// --- 4. Les compteurs --------------------------------------------------------
const maxProduit = Math.max(0, ...produits.map((p) => p.id));
const maxColoris = Math.max(0, ...produits.flatMap((p) => (p.colors ?? []).map((c) => c.id)));

dire(`\n\n-- ═════════════════════════════════════════════════════════════`);
dire(`-- Compteurs`);
dire(`-- ═════════════════════════════════════════════════════════════`);
dire(`-- Reprendre après les identifiants réinsérés ci-dessus.`);
dire(`select setval(pg_get_serial_sequence('public.products', 'id'), ${maxProduit});`);
dire(`select setval(pg_get_serial_sequence('public.product_colors', 'id'), ${maxColoris});`);
dire(
  `select setval(pg_get_serial_sequence('public.product_photos', 'id'), coalesce((select max(id) from public.product_photos), 1));`,
);
dire(`
-- Les commandes démarrent à ${PREMIERE_COMMANDE}, et c'est le point important
-- de tout ce fichier : les 186 commandes de l'ancien projet portent les
-- numéros 1 à 186. Si les nouvelles commençaient à 1 elles occuperaient ces
-- numéros, et la réimportation deviendrait impossible sans renuméroter —
-- c'est-à-dire sans mentir à la cliente qui a noté son numéro de commande.`);
dire(`select setval(pg_get_serial_sequence('public.orders', 'id'), ${PREMIERE_COMMANDE}, false);`);

dire(`\ncommit;`);
dire(`
-- ─────────────────────────────────────────────────────────────
-- Tout est en une seule transaction : en cas d'erreur, rien n'est écrit et
-- le projet reste vierge. On corrige et on relance, sans nettoyage.
--
-- Le bucket « product-photos » est créé par la migration ..._storage.sql,
-- il n'y a rien à faire dans l'onglet Storage. Il est vide, et c'est normal :
-- les photos actuelles sont servies par le site. Il ne servira qu'aux
-- prochaines photos ajoutées depuis l'admin.
--
-- Après le « Run », deux choses seulement :
--   1. Authentication → Users → Add user : recréer le compte admin.
--   2. Project Settings → API : reporter l'URL et les deux clés dans les
--      variables d'environnement Netlify.
-- ─────────────────────────────────────────────────────────────`);

fs.writeFileSync(SORTIE, morceaux.join("\n") + "\n");

const photos = produits.reduce((s, p) => s + (p.colors ?? []).reduce((t, c) => t + (c.photos?.length ?? 0), 0), 0);
const coloris = produits.reduce((s, p) => s + (p.colors ?? []).length, 0);
console.log(`Écrit : ${SORTIE} (${(fs.statSync(SORTIE).size / 1024).toFixed(0)} ko)`);
console.log(`  migrations : ${fichiers.length}`);
console.log(`  wilayas    : ${tarifs.length}`);
console.log(`  veilleuses : ${produits.length}`);
console.log(`  coloris    : ${coloris}`);
console.log(`  photos     : ${photos}`);
console.log(`  commandes  : numérotation à partir de ${PREMIERE_COMMANDE}`);
