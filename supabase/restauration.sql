-- Restauration complète de la boutique Naja
-- Généré le 2026-11-06T00:48:34.706Z par scripts/generer-restauration.mjs
--
-- À coller dans l'éditeur SQL d'un projet Supabase NEUF, puis « Run ».
-- Ne rien exécuter là-dessus sur un projet qui contient déjà des commandes.
--
-- Ce fichier ne contient AUCUNE commande et AUCUNE donnée de cliente : il
-- reconstruit la boutique, pas l'historique. Les 186 commandes de l'ancien
-- projet se réimportent séparément, une fois celui-ci rouvert.

begin;


-- ─────────────────────────────────────────────────────────────
-- 20260811131001_init_schema.sql
-- ─────────────────────────────────────────────────────────────
-- Naja — initial schema.
-- Design notes (see CONTEXT.md for the full write-up):
-- - bigint identity PKs, not UUIDs: simpler, no extension, readable order numbers.
-- - Prices are integers in DZD (no decimals — that's how dinars are quoted).
-- - order_total is a generated column so it can never drift from
--   products_total + delivery_fee.
-- - orders.wilaya is a real FK into delivery_rates(wilaya): an order can never
--   reference a wilaya that doesn't exist, while delivery_fee stays an
--   independent snapshot so future rate edits never touch past orders.
-- - product_id/product_color_id on order_items are ON DELETE RESTRICT: you
--   cannot delete a product or color that has ever been ordered. Use the
--   in_stock toggle to retire a color instead of deleting it.

create type order_status as enum ('nouvelle', 'confirmée', 'expédiée', 'livrée', 'annulée');
create type delivery_method as enum ('domicile', 'stopdesk');

create table public.products (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  description text not null default '',
  price integer not null check (price >= 0),
  created_at timestamptz not null default now()
);

create table public.product_colors (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  color_name text not null,
  color_hex text,
  in_stock boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, color_name)
);
create index product_colors_product_idx on public.product_colors (product_id);

create table public.product_photos (
  id bigint generated always as identity primary key,
  product_color_id bigint not null references public.product_colors (id) on delete cascade,
  url text not null,
  position integer not null default 0
);
create index product_photos_color_idx on public.product_photos (product_color_id, position);

create table public.delivery_rates (
  id bigint generated always as identity primary key,
  wilaya text not null unique,
  domicile_price integer not null default 0 check (domicile_price >= 0),
  stopdesk_price integer check (stopdesk_price is null or stopdesk_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger delivery_rates_set_updated_at
  before update on public.delivery_rates
  for each row execute function public.set_updated_at();

create table public.orders (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  status order_status not null default 'nouvelle',
  customer_first_name text not null,
  customer_last_name text not null,
  phone text not null,
  wilaya text not null references public.delivery_rates (wilaya) on update cascade on delete restrict,
  commune text not null,
  delivery_method delivery_method not null,
  delivery_fee integer not null check (delivery_fee >= 0),
  products_total integer not null check (products_total >= 0),
  order_total integer generated always as (products_total + delivery_fee) stored,
  notes_client text,
  internal_notes text
);
create index orders_status_idx on public.orders (status);

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  product_id bigint not null references public.products (id) on delete restrict,
  product_color_id bigint not null references public.product_colors (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  price_at_order integer not null check (price_at_order >= 0)
);
create index order_items_order_idx on public.order_items (order_id);

-- ─────────────────────────────────────────────────────────────
-- 20260811131002_rls.sql
-- ─────────────────────────────────────────────────────────────
-- Row Level Security. Every table gets RLS enabled and SELECT-only policies —
-- there are deliberately no INSERT/UPDATE/DELETE policies anywhere. All writes
-- go through the service_role client in a Server Action, which bypasses RLS
-- entirely (see the grants migration). Belt-and-suspenders: even if a future
-- change accidentally grants a write privilege to anon/authenticated, RLS
-- still has no policy allowing it, so the write is denied by default.

alter table public.products enable row level security;
alter table public.product_colors enable row level security;
alter table public.product_photos enable row level security;
alter table public.delivery_rates enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Catalog + delivery rates: needed on the public site (product pages,
-- checkout wilaya dropdown) with no one logged in, so both anon and
-- authenticated can read.
create policy "products readable by everyone"
  on public.products for select
  to anon, authenticated
  using (true);

create policy "product_colors readable by everyone"
  on public.product_colors for select
  to anon, authenticated
  using (true);

create policy "product_photos readable by everyone"
  on public.product_photos for select
  to anon, authenticated
  using (true);

create policy "delivery_rates readable by everyone"
  on public.delivery_rates for select
  to anon, authenticated
  using (true);

-- Orders contain customer name/phone/address — only a logged-in admin
-- (any authenticated Supabase Auth user; there's one owner) can read them.
-- Logged-out visitors get nothing back, not even their own just-placed order.
create policy "orders readable by admin only"
  on public.orders for select
  to authenticated
  using (true);

create policy "order_items readable by admin only"
  on public.order_items for select
  to authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────
-- 20260811131003_grants.sql
-- ─────────────────────────────────────────────────────────────
-- Base table grants. RLS policies filter rows; they do NOT grant table
-- access — Postgres checks GRANTs first and returns "permission denied for
-- table X" before RLS is ever evaluated. A fresh Supabase project can leave
-- anon/authenticated/service_role with zero privileges on public even with
-- RLS fully written, so these are explicit rather than assumed.

grant usage on schema public to anon, authenticated, service_role;

-- anon: public catalog + delivery rates only, read-only.
grant select on
  public.products,
  public.product_colors,
  public.product_photos,
  public.delivery_rates
  to anon;

-- authenticated: same, plus read access to orders for the admin dashboard.
-- Still read-only — admin writes go through service_role, not this role.
grant select on
  public.products,
  public.product_colors,
  public.product_photos,
  public.delivery_rates,
  public.orders,
  public.order_items
  to authenticated;

-- service_role: full access. It bypasses RLS by default, but still needs
-- these base grants to touch the tables at all.
grant select, insert, update, delete on
  public.products,
  public.product_colors,
  public.product_photos,
  public.delivery_rates,
  public.orders,
  public.order_items
  to service_role;

-- ─────────────────────────────────────────────────────────────
-- 20260811131004_storage.sql
-- ─────────────────────────────────────────────────────────────
-- Storage bucket for product photos. Public bucket — these are just product
-- images, nothing sensitive, and the public site needs to display them
-- without any auth. Uploads/deletes happen via the service_role client only
-- (admin panel, Phase 5) — service_role bypasses storage RLS too, so no
-- write policy is needed here for anon/authenticated.

insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

create policy "product photos are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-photos');

-- ─────────────────────────────────────────────────────────────
-- 20260812173005_add_cutout_photo.sql
-- ─────────────────────────────────────────────────────────────
-- A dedicated cutout (background-removed) photo per color, separate from
-- the normal product_photos gallery. Hero/catalog/boutique-listing cards
-- prefer this when set; the product detail page keeps showing the normal
-- gallery untouched. Nullable: a color without a cutout yet just falls
-- back to its first normal photo on cards.
alter table public.product_colors add column cutout_photo_url text;

-- ─────────────────────────────────────────────────────────────
-- 20260917200001_add_second_color_hex.sql
-- ─────────────────────────────────────────────────────────────
-- A second hue per colour, so a variant can be bicolour ("Bleu & Blanc")
-- without changing how an order records what was chosen: the duo stays ONE
-- product_colors row, so order_items.product_color_id keeps working untouched
-- and the variant carries its own photos and cutout like any other colour.
-- That is the whole point of doing it this way rather than letting a customer
-- combine two arbitrary colours, which would have needed a second FK on
-- order_items plus admin, confirmation and Telegram changes.
--
-- Nullable, and null is the normal case: a colour with no second hue is
-- plain, and every existing row stays exactly as it is. The storefront draws
-- a split swatch only when this is set.
alter table public.product_colors add column color_hex_2 text;

-- ─────────────────────────────────────────────────────────────
-- 20260930173000_add_order_status_dates.sql
-- ─────────────────────────────────────────────────────────────
-- Naja — les dates de changement de statut.
--
-- Pourquoi. `orders` ne gardait que `created_at` et un statut : on savait
-- qu'une commande était livrée, jamais QUAND elle l'était devenue. Aucun délai
-- n'était donc calculable, et `adminStats.ts` le disait plutôt que d'inventer
-- un chiffre (« Pas de chiffre inventé en attendant »). Ces trois colonnes
-- débloquent les délais.
--
-- Trois colonnes, une par étape, plutôt qu'un `updated_at` unique. Un
-- `updated_at` ne garde que le DERNIER changement : une commande livrée aurait
-- perdu la date de sa confirmation, et le découpage
-- confirmation → expédition → livraison aurait été impossible — or c'est
-- exactement ce qui distingue un retard d'atelier d'un retard de livreur.
--
-- Aucune reprise des commandes passées, et c'est définitif : l'information n'a
-- jamais été enregistrée, elle n'existe nulle part. Ces commandes restent à
-- `null` et sont exclues des moyennes, qui affichent donc sur combien de
-- commandes elles portent. Un chiffre honnête valait mieux qu'un chiffre
-- inventé.
--
-- Aucun changement de droits ni de RLS : les grants sont au niveau de la table,
-- donc une colonne ajoutée est déjà couverte — même constat que la migration de
-- la photo détourée (20260812173005).
--
-- `if not exists` pour que le fichier puisse être relancé sans erreur : le
-- round 2 a montré qu'un script non idempotent relancé par erreur fait croire à
-- une panne là où il n'y en a pas.
--
-- Ajouter une colonne nullable sans valeur par défaut est instantané en
-- Postgres : la table n'est pas réécrite, et aucune commande n'est touchée.

alter table public.orders
  add column if not exists confirmed_at timestamptz,
  add column if not exists shipped_at   timestamptz,
  add column if not exists delivered_at timestamptz;

-- ─────────────────────────────────────────────────────────────
-- 20261003120000_add_order_prepared.sql
-- ─────────────────────────────────────────────────────────────
-- Naja — « commande préparée ».
--
-- La patronne veut cocher une commande quand elle est EMBALLÉE, prête à partir,
-- mais pas encore chez le livreur. C'est une information que les cinq statuts
-- ne portent pas : « confirmée » couvre aussi bien une commande pas encore
-- commencée qu'une commande emballée qui attend le livreur.
--
-- Une date, et pas un booléen. Un booléen dirait seulement « c'est prêt » ; une
-- date dit aussi QUAND, donc combien de temps la préparation prend en moyenne,
-- et combien de commandes attendent le livreur depuis deux jours. C'est la même
-- raison qui a fait choisir des dates pour `confirmed_at` / `shipped_at` /
-- `delivered_at` (voir 20260930173000).
--
-- `null` veut dire « pas encore préparée », et décocher la case y remet la
-- colonne : la case n'est pas un journal, c'est l'état courant.
--
-- Aucun changement de droits ni de RLS : les grants sont au niveau de la table,
-- donc une colonne ajoutée est déjà couverte — même constat que la migration de
-- la photo détourée (20260812173005).
--
-- `if not exists` pour que le fichier puisse être relancé sans erreur.

alter table public.orders
  add column if not exists prepared_at timestamptz;

-- ─────────────────────────────────────────────────────────────
-- 20261013140000_add_workshops.sql
-- ─────────────────────────────────────────────────────────────
-- Naja — les ateliers.
--
-- La patronne lance un atelier : on y dessine des veilleuses imprimées en 3D,
-- animé par deux personnes. Le site doit pouvoir présenter l'atelier et
-- recueillir des inscriptions, et l'admin doit pouvoir suivre qui vient.
--
-- Pourquoi une table `workshops` et pas des valeurs dans un fichier du code,
-- comme l'aperçu Octobre Rose : la date, le lieu, le prix et le nombre de
-- places changent, et ce sont exactement les quatre choses qui ne doivent pas
-- dépendre d'un déploiement. Les écrire en base est aussi ce qui permettra
-- d'annoncer un deuxième atelier sans retoucher le code.
--
-- ⚠️ Ce fichier contient À LA FOIS le schéma, la RLS et les grants, alors que
-- les trois vivent dans des fichiers séparés pour le schéma initial. Ce n'est
-- pas un relâchement de la règle, c'est la conséquence de ce qu'elle protège :
-- la migration `20261003120000_add_order_prepared` pouvait se contenter d'un
-- `alter table`, parce que les grants de `orders` sont posés au niveau de la
-- TABLE et couvrent donc déjà toute colonne ajoutée. Une table NEUVE, elle,
-- n'est couverte par rien : sans son propre `grant`, PostgREST répond
-- « permission denied for table workshops » — et sans policy, la RLS la refuse
-- même au service_role. Séparer les trois morceaux ici ne les rendrait pas
-- plus lisibles, seulement plus faciles à oublier.
--
-- `if not exists` partout pour que le fichier puisse être relancé sans erreur,
-- comme les migrations de colonnes.

-- « confirmée », « expédiée », « livrée », « annulée » portent déjà des accents
-- dans `order_status` : les valeurs d'enum accentuées sont la convention de ce
-- schéma, pas une exception qu'on s'autorise ici.
-- Le type est nommé en entier (`public.…`) et le test d'existence vise
-- explicitement le schéma public. Sans ça, la création dépendrait du
-- `search_path` de la session qui exécute le fichier — ce qui marche dans l'éditeur
-- SQL de Supabase et pourrait ne pas marcher ailleurs.
do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'workshop_registration_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.workshop_registration_status as enum ('inscrit', 'confirmé', 'venu', 'annulé');
  end if;
end
$$;

-- Le contenu éditorial de l'atelier, tel que la patronne le saisit.
--
-- `price` est un entier en DA, sans décimales, exactement comme `products.price`
-- (c'est ainsi que les dinars se disent). Zéro veut dire gratuit : la page
-- affiche « Gratuit » plutôt que « 0 DA ».
--
-- `seats` est nullable et signifie « aucune limite annoncée ». La patronne a
-- demandé que le nombre soit AFFICHÉ sans rien bloquer : c'est donc une
-- information d'affichage, et le formulaire reste ouvert même au-delà. Le
-- décompte réel des inscrits vit dans `workshop_registrations`, pas ici — un
-- compteur posé sur cette table finirait par mentir.
--
-- `ends_at` est optionnel : une heure de fin se dit bien dans une description,
-- mais « de 14h à 17h » se lit mieux quand c'est deux colonnes qui le portent.
create table if not exists public.workshops (
  id bigint generated always as identity primary key,
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null default '',
  price integer not null default 0 check (price >= 0),
  seats integer check (seats is null or seats > 0),
  created_at timestamptz not null default now()
);

-- Les inscriptions. Le nom est stocké en deux colonnes comme pour les commandes
-- (`orders.customer_first_name` / `customer_last_name`) : le formulaire ne
-- demande qu'un champ, mais c'est une règle d'AFFICHAGE, pas de données — le
-- découpage se fait une fois, côté serveur, dans `decouperNom` (src/lib/phone.ts).
--
-- `unique (workshop_id, phone)` n'est pas une précaution de style : sans elle,
-- un double clic sur « Je m'inscris » crée deux lignes, et la liste des inscrits
-- — la seule chose que la patronne va vraiment lire — se met à mentir dès le
-- premier jour. C'est aussi ce qui produit le « vous êtes déjà inscrit ».
--
-- `on delete cascade` sur l'atelier : supprimer un atelier supprime ses
-- inscriptions. Contrairement aux commandes (dont les lignes sont en RESTRICT),
-- une inscription à un atelier qui n'existe plus n'a aucune valeur — ni
-- comptable, ni historique.
create table if not exists public.workshop_registrations (
  id bigint generated always as identity primary key,
  workshop_id bigint not null references public.workshops (id) on delete cascade,
  created_at timestamptz not null default now(),
  status public.workshop_registration_status not null default 'inscrit',
  first_name text not null,
  last_name text not null,
  phone text not null,
  unique (workshop_id, phone)
);

-- `starts_at` : la page publique filtre sur « le prochain atelier qui commence
-- après maintenant » et trie dessus. L'index sert ce tri-là.
create index if not exists workshops_starts_at_idx on public.workshops (starts_at);

-- `(workshop_id, status)` : l'admin liste les inscrits d'un atelier et compte
-- ceux qui ne sont pas annulés. Même forme que `product_photos (product_color_id,
-- position)` dans le schéma initial.
create index if not exists workshop_registrations_workshop_idx
  on public.workshop_registrations (workshop_id, status);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Même discipline que 20260811131002_rls.sql : des policies de SELECT
-- uniquement, aucune d'écriture. Toutes les écritures passent par le client
-- service-role dans une Server Action, qui contourne la RLS — et c'est
-- précisément pour ça qu'il n'existe aucune policy d'écriture : même si un
-- futur changement accordait par erreur un privilège d'insertion à anon, la
-- RLS n'aurait toujours aucune policy pour l'autoriser.

alter table public.workshops enable row level security;
alter table public.workshop_registrations enable row level security;

-- L'atelier est une annonce publique : la page /atelier le lit sans personne
-- de connecté.
drop policy if exists "workshops lisibles par tout le monde" on public.workshops;
create policy "workshops lisibles par tout le monde"
  on public.workshops for select
  to anon, authenticated
  using (true);

-- Les inscriptions portent des noms et des téléphones. « Authenticated » ici
-- veut dire « l'admin » : il n'y a qu'un compte, et aucune cliente n'en a un.
-- C'est la même frontière que pour `orders` — et pour la même raison, il ne
-- doit jamais exister de chemin anonyme vers cette table.
drop policy if exists "inscriptions lisibles par l'admin seulement" on public.workshop_registrations;
create policy "inscriptions lisibles par l'admin seulement"
  on public.workshop_registrations for select
  to authenticated
  using (true);

-- ── Grants ───────────────────────────────────────────────────────────────────
-- Rappel du fichier initial : les policies filtrent des LIGNES, elles
-- n'accordent aucun accès à la table. Postgres vérifie les GRANTs d'abord.

-- anon : l'annonce seulement, en lecture.
grant select on public.workshops to anon;

-- authenticated : l'annonce et les inscrits, toujours en lecture. Les écritures
-- de l'admin passent par service_role, pas par ce rôle.
grant select on public.workshops, public.workshop_registrations to authenticated;

-- service_role : tout. Il contourne la RLS, mais il lui faut quand même ces
-- grants de base pour toucher les tables.
grant select, insert, update, delete on
  public.workshops,
  public.workshop_registrations
  to service_role;

-- ─────────────────────────────────────────────────────────────
-- 20261015120000_add_workshop_deposit.sql
-- ─────────────────────────────────────────────────────────────
-- Naja — acompte à verser d'avance pour réserver une place d'atelier.
--
-- La patronne demande 2 000 DA à régler d'avance pour valider une inscription,
-- par CCP, virement bancaire, ou au bureau d'Invent. Cette information change
-- ce que la page dit au visiteur : sans elle, un bouton « Réserver ma place »
-- se lit comme « ma place est réservée », alors qu'il reste une étape à faire.
--
-- Une colonne, et pas du texte libre dans la description, pour la même raison
-- que le prix : un montant écrit dans un paragraphe ne suit pas quand le prix
-- change, et la page finirait par se contredire toute seule.
--
-- Zéro veut dire « aucun acompte ». C'est la valeur par défaut, donc les
-- ateliers déjà enregistrés gardent leur sens.
--
-- `add column if not exists` : le fichier peut être relancé sans erreur. Aucun
-- changement de droits ni de RLS — les grants sont au niveau de la TABLE, donc
-- une colonne ajoutée est déjà couverte. Même constat que la migration de
-- `orders.prepared_at` (20261003120000).

alter table public.workshops
  add column if not exists deposit integer not null default 0;

-- La contrainte de positivité est posée dans un second temps, et son existence
-- est testée explicitement : `add column ... check (...)` l'aurait posée aussi,
-- mais il n'existe pas de `if not exists` pour une contrainte, et un deuxième
-- passage du fichier échouerait sur « constraint already exists ».
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'workshops_deposit_check'
      and conrelid = 'public.workshops'::regclass
  ) then
    alter table public.workshops
      add constraint workshops_deposit_check check (deposit >= 0);
  end if;
end
$$;


-- ═════════════════════════════════════════════════════════════
-- Tarifs de livraison — 58 wilayas
-- ═════════════════════════════════════════════════════════════
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('01 Adrar', 1000, 800) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('02 Chlef', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('03 Laghouat', 850, 700) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('04 Oum El Bouaghi', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('05 Batna', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('06 Béjaïa', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('07 Biskra', 850, 700) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('08 Béchar', 1000, 800) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('09 Blida', 550, 450) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('10 Bouira', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('11 Tamanrasset', 1500, 1300) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('12 Tébessa', 850, 700) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('13 Tlemcen', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('14 Tiaret', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('15 Tizi Ouzou', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('16 Alger', 500, 400) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('17 Djelfa', 850, 700) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('18 Jijel', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('19 Sétif', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('20 Saïda', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('21 Skikda', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('22 Sidi Bel Abbès', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('23 Annaba', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('24 Guelma', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('25 Constantine', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('26 Médéa', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('27 Mostaganem', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('28 M''Sila', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('29 Mascara', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('30 Ouargla', 850, 700) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('31 Oran', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('32 El Bayadh', 1000, 800) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('33 Illizi', 1500, 1300) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('34 Bordj Bou Arréridj', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('35 Boumerdès', 550, 450) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('36 El Tarf', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('37 Tindouf', 1500, 1300) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('38 Tissemsilt', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('39 El Oued', 850, 700) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('40 Khenchela', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('41 Souk Ahras', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('42 Tipaza', 550, 450) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('43 Mila', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('44 Aïn Defla', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('45 Naâma', 1000, 800) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('46 Aïn Témouchent', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('47 Ghardaïa', 850, 700) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('48 Relizane', 700, 600) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('49 Timimoun', 1000, 800) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('50 Bordj Badji Mokhtar', 1000, 800) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('51 Ouled Djellal', 850, 700) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('52 Béni Abbès', 1000, 850) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('53 In Salah', 1500, 1300) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('54 In Guezzam', 1500, 1300) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('55 Touggourt', 850, 700) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('56 Djanet', 1500, 1300) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('57 El M''Ghair', 850, 700) on conflict (wilaya) do nothing;
insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values ('58 El Meniaa', 850, 700) on conflict (wilaya) do nothing;


-- ═════════════════════════════════════════════════════════════
-- Catalogue — 8 veilleuses
-- Les photos pointent vers /veilleuses/… : elles sont servies par
-- Netlify depuis public/, plus par Supabase Storage. C'est ce qui
-- empêche l'egress de repartir comme avant.
-- ═════════════════════════════════════════════════════════════

-- Akari
insert into public.products (id, slug, name, description, price) overriding system value values (9, 'akari', 'Akari', 'Sous son abat-jour blanc délicatement plissé, façon jupe de danseuse, Akari cache une base toute en rondeur. Posée sur une table de chevet ou un coin de salon, elle diffuse une lueur douce et enveloppante — le genre de lumière qui donne envie de rester encore un peu. Imprimée à la main, pièce par pièce : la vôtre aura toujours son petit grain de caractère à elle.', 3000);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (10, 9, 'Rouge', '#d40608', NULL, true, '/veilleuses/10/cutout-1787496750202-15-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (10, '/veilleuses/10/1787496291694-Image_Codex_23_ao_t_2026__15_42_25-w1920.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (8, 9, 'Bleu Nuit', '#1b2058', NULL, true, '/veilleuses/8/cutout-1787496728306-19-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (8, '/veilleuses/8/1787496198492-Image_Codex_23_ao_t_2026__15_39_05-w1920.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (13, 9, 'Vert', '#2c6755', NULL, true, '/veilleuses/13/cutout-1787496793452-20-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (13, '/veilleuses/13/1787496268854-Image_Codex_23_ao_t_2026__15_39_00-w1920.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (9, 9, 'Beige', '#e2c9ab', NULL, true, '/veilleuses/9/cutout-1787496738453-18-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (9, '/veilleuses/9/1787496223388-Image_Codex_23_ao_t_2026__15_40_03-w1920.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (12, 9, 'Rouge Rose', '#e81b2c', NULL, false, '/veilleuses/12/cutout-1787496780548-17-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (12, '/veilleuses/12/1787496247925-Image_Codex_23_ao_t_2026__15_41_02-w1920.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (11, 9, 'Rose', '#f6c6ce', NULL, false, '/veilleuses/11/cutout-1787496765365-16-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (11, '/veilleuses/11/1787496315234-Image_Codex_23_ao_t_2026__15_43_18-w1920.webp', 0);

-- Japandi
insert into public.products (id, slug, name, description, price) overriding system value values (10, 'japandi', 'Japandi', 'Avec sa silhouette de champignon et ses fines cannelures verticales, Japandi ressemble à une petite lanterne qu''on aurait cueillie au clair de lune. Une fois allumée, elle s''illumine de l''intérieur et transforme la pièce en un coin tout doux, façon veilleuse un peu magique. Ligne épurée, forme qui ne passe pas inaperçue : le mariage parfait entre minimalisme et caractère. Imprimée à la main, pièce par pièce — la vôtre aura toujours son petit grain de caractère à elle.', 3300);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (17, 10, 'Blanc', '#ffffff', NULL, true, '/veilleuses/17/cutout-1787498198091-5-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (17, '/veilleuses/17/1787498417639-Image_Codex_23_ao_t_2026__16_17_01-w1920.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (48, 10, 'Bleu', '#042cee', NULL, true, '/veilleuses/48/cutout-1787917639814-lk_lkl-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (48, '/veilleuses/48/1787957742960-IMG_6617-c1793831055269.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (14, 10, 'Rouge', '#f70e01', NULL, true, '/veilleuses/14/cutout-1787498247423-4-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (14, '/veilleuses/14/1787498285182-Image_Codex_23_ao_t_2026__16_16_00-w1920.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (18, 10, 'Vert', '#c5c406', NULL, true, '/veilleuses/18/cutout-1787498225863-3-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (18, '/veilleuses/18/1787498440293-Image_Codex_23_ao_t_2026__16_19_22-w1920.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (75, 10, 'Orange', '#ff6a00', NULL, true, '/veilleuses/75/cutout-1791625916124-IMG_7730.webp');
insert into public.product_photos (product_color_id, url, position) values (75, '/veilleuses/75/1791625909135-IMG_7731.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (16, 10, 'Fuchsia', '#ee2a8c', NULL, true, '/veilleuses/16/cutout-1787498548155-2-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (16, '/veilleuses/16/1787498572831-Image_Codex_23_ao_t_2026__16_20_40-w1920.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (15, 10, 'Bleu turquoise', '#01dfb3', NULL, false, '/veilleuses/15/cutout-1787498522438-1-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (15, '/veilleuses/15/1787498392661-Image_Codex_23_ao_t_2026__16_16_05-w1920.webp', 0);

-- Champignon
insert into public.products (id, slug, name, description, price) overriding system value values (11, 'champignon', 'Champignon', 'Avec son chapeau généreusement plissé posé sur un pied tout rond, Champignon a des airs de champignon sorti tout droit d''un sous-bois enchanté. Sa silhouette compacte et ses courbes douces en font la compagne parfaite d''une table de chevet ou d''une étagère, où elle diffuse une lumière chaleureuse dès qu''on l''allume. Un brin espiègle, elle apporte tout de suite une touche de fantaisie à la pièce. Imprimée à la main, pièce par pièce — la vôtre aura toujours son petit grain de caractère à elle.', 3300);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (21, 11, 'Vert', '#c8c439', NULL, true, '/veilleuses/21/cutout-1787766169446-Untitled_-_26_ao_t_2026___18.41.27-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (21, '/veilleuses/21/1787497508555-Image_Codex_23_ao_t_2026__16_03_47-w1920.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (20, 11, 'Rouge', '#f72514', NULL, true, '/veilleuses/20/cutout-1787766217084-Untitled_-_26_ao_t_2026___18.40.29-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (20, '/veilleuses/20/1787497474671-Image_Codex_23_ao_t_2026__16_02_50-w1920.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (22, 11, 'Blanc', '#f3f1f0', NULL, true, '/veilleuses/22/cutout-1787497308548-10-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (22, '/veilleuses/22/1787497904823-Image_Codex_23_ao_t_2026__16_11_08-w1920.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (23, 11, 'Fuchsia', '#fb15ba', NULL, true, '/veilleuses/23/cutout-1787766173302-Untitled_-_26_ao_t_2026___18.41.55-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (23, '/veilleuses/23/1787497686790-Image_Codex_23_ao_t_2026__16_07_28-w1920.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (49, 11, 'bleu', '#065ede', NULL, true, '/veilleuses/49/cutout-1788607155050-Firefly_RemoveBackground.webp');
insert into public.product_photos (product_color_id, url, position) values (49, '/veilleuses/49/1788607151366-Image_Codex_5_sept._2026__12_18_54.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (79, 11, 'Orange', '#ff6a00', NULL, true, '/veilleuses/79/cutout-1792659847369-3BEC1B18-4E49-4447-8761-01B2FE064ACC.webp');
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (80, 11, 'Rose', '#e57783', NULL, true, '/veilleuses/80/cutout-1792659994999-02928440-8F44-4D9B-A256-6E80A9AF5863.webp');
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (19, 11, 'Bleu turquoise', '#32f0d1', NULL, false, '/veilleuses/19/cutout-1787766159228-Untitled_-_26_ao_t_2026___18.41.43-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (19, '/veilleuses/19/1787497544916-Image_Codex_23_ao_t_2026__16_04_47-w1920.webp', 0);

-- Capricorne
insert into public.products (id, slug, name, description, price) overriding system value values (12, 'capricorne', 'Capricorne', 'Cannelée du sommet à la base, Capricorne adopte une silhouette droite et assurée, comme une petite colonne posée sur un socle bien ancré. Une fois allumée, la lumière traverse ses fines rainures et enveloppe la pièce d''une clarté douce et homogène. Discrète le jour, apaisante le soir : elle trouve sa place aussi bien sur un bureau qu''une table de nuit. Imprimée à la main, pièce par pièce — la vôtre aura toujours son petit grain de caractère à elle.', 3400);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (26, 12, 'Vert', '#c1c310', NULL, true, '/veilleuses/26/cutout-1787496989864-14-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (26, '/veilleuses/26/1787479481852-ChatGPT_Image_22_ao_t_2026__13_59_41-w1920.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (25, 12, 'Rouge', '#f50f07', NULL, true, '/veilleuses/25/cutout-1787496970319-13-w1920-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (25, '/veilleuses/25/1787479391149-ChatGPT_Image_22_ao_t_2026__13_59_36-w1920-w1920.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (24, 12, 'Blanche', '#fef8ef', NULL, true, '/veilleuses/24/cutout-1787496949504-12-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (24, '/veilleuses/24/1787479215009-ChatGPT_Image_22_ao_t_2026__13_59_39-w1920.webp', 0);

-- Nami
insert into public.products (id, slug, name, description, price) overriding system value values (19, 'nami', 'Nami', 'Trois volumes tout ronds et finement cannelés, empilés les uns sur les autres comme des vagues figées, posés sur un socle carré bien droit. Une fois allumée, Nami ne se contente pas de s''illuminer : sa lumière s''échappe entre les plis et dessine de jolis motifs sur le mur et la table autour d''elle. Douce et sculpturale à la fois, elle fait autant office de lampe que de petite pièce déco. Imprimée à la main, pièce par pièce — la vôtre aura toujours son petit grain de caractère à elle.', 3400);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (41, 19, 'Gris', '#969696', NULL, false, '/veilleuses/41/cutout-1787498876589-nami-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (41, '/veilleuses/41/1787498901791-Image_Codex_23_ao_t_2026__16_24_27-w1920.webp', 0);

-- Origami
insert into public.products (id, slug, name, description, price) overriding system value values (21, 'origami', 'Origami', 'Origami est une veilleuse sculpturale aux lignes facettées, inspirée de l’art du pliage. Sa lumière douce et chaleureuse sublime ses formes géométriques et crée une atmosphère élégante, apaisante et contemporaine.', 3000);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (44, 21, 'Rouge', '#e4001e', NULL, true, '/veilleuses/44/cutout-1787567624614-ChatGPT_Image_24_ao_t_2026__11_30_47-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (44, '/veilleuses/44/1787499635119-Image_Codex_23_ao_t_2026__16_36_50-w1920.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (47, 21, 'Blanc & bleu', '#0125f1', NULL, true, '/veilleuses/47/cutout-1787567700911-ChatGPT_Image_24_ao_t_2026__11_30_43-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (47, '/veilleuses/47/1787499680618-Image_Codex_23_ao_t_2026__16_39_56-w1920.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (46, 21, 'Bleu', '#0125f1', NULL, true, '/veilleuses/46/cutout-1787567757885-24-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (46, '/veilleuses/46/1787499657416-Image_Codex_23_ao_t_2026__16_37_58-w1920.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (45, 21, 'Blanc & Rouge', '#e4001e', NULL, true, '/veilleuses/45/cutout-1787567663807-ChatGPT_Image_24_ao_t_2026__11_30_40-c1793831055269.webp');
insert into public.product_photos (product_color_id, url, position) values (45, '/veilleuses/45/1787499965664-Image_Codex_23_ao_t_2026__16_41_02-w1920.webp', 0);

-- nomura
insert into public.products (id, slug, name, description, price) overriding system value values (22, 'nomura', 'nomura', 'Lumière chaude, zéro éblouissement. Son abat-jour nervuré diffuse une lueur enveloppante qui adoucit la pièce sans agresser les yeux — celle qu''on allume à 22 h, quand le plafonnier est trop violent. Posée sur la table de nuit ou le bureau, elle suffit.

Imprimée en 3D dans mon atelier, 28cm cm. Se branche sur secteur, câble de 1.20m avec interrupteur. Plusieurs coloris disponibles.', 3200);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (66, 22, 'Blanc/Bleu', '#ffffff', '#0b95ed', true, '/veilleuses/66/cutout-1789662417354-Image_Codex_17_sept._2026__17_26_27-w1199.webp');
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (60, 22, 'Orange', '#fb691b', NULL, true, '/veilleuses/60/cutout-1789653239696-Image_Codex_17_sept._2026__14_53_42-w1199.webp');
insert into public.product_photos (product_color_id, url, position) values (60, '/veilleuses/60/1792330379597-IMG_7913.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (62, 22, 'Blanc', '#ffffff', NULL, true, '/veilleuses/62/cutout-1789653464701-Image_Codex_17_sept._2026__14_57_09-w1199.webp');
insert into public.product_photos (product_color_id, url, position) values (62, '/veilleuses/62/1792330395197-IMG_7911.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (72, 22, 'Bleu/Rose', '#ec5571', '#0eb6f9', true, '/veilleuses/72/cutout-1789670901017-Image_Codex_17_sept._2026__19_47_59-w1199.webp');
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (63, 22, 'Rose', '#eb6b83', NULL, true, '/veilleuses/63/cutout-1789653591126-Image_Codex_17_sept._2026__14_59_36-w1199.webp');
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (67, 22, 'Blanc/Rose', '#ffffff', '#ed586e', true, '/veilleuses/67/cutout-1789662471600-Image_Codex_17_sept._2026__17_27_37-w1199.webp');
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (74, 22, 'Blanc/Rouge', '#ffffff', '#e81b17', true, '/veilleuses/74/cutout-1789671477980-Image_Codex_17_sept._2026__19_57_48-w1199.webp');
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (71, 22, 'Bleu/Orange', '#059bec', '#ee5f0d', true, '/veilleuses/71/cutout-1789670772799-Image_Codex_17_sept._2026__19_45_39-w1199.webp');
insert into public.product_photos (product_color_id, url, position) values (71, '/veilleuses/71/1792330459580-IMG_7926.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (77, 22, 'Orange/vert', '#ff9a20', '#78a34c', true, '/veilleuses/77/cutout-1791883048406-Lampe_champignon_orange_et_verte_rainur_e.webp');
insert into public.product_photos (product_color_id, url, position) values (77, '/veilleuses/77/1792330468621-IMG_7927.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (76, 22, 'Rose clair', '#ee95a7', NULL, true, '/veilleuses/76/cutout-1791882562904-Lampe_champignon_rose_pliss_e.webp');
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (78, 22, 'Rose/blanc', '#ffb0c2', '#ffffff', true, '/veilleuses/78/cutout-1791893450631-Lampe_champignon_rose_pliss_e__1_.webp');
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (68, 22, 'Blanc/Vert', '#ffffff', '#6d902a', true, '/veilleuses/68/cutout-1789664866538-Image_Codex_17_sept._2026__18_07_31-w1200.webp');
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (69, 22, 'Vert/Rose', '#5b7d18', '#ee5181', true, '/veilleuses/69/cutout-1789665266232-Image_Codex_17_sept._2026__18_10_19-w1199.webp');
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (64, 22, 'Vert', '#739831', NULL, true, '/veilleuses/64/cutout-1789653653916-Image_Codex_17_sept._2026__15_00_37-w1200.webp');
insert into public.product_photos (product_color_id, url, position) values (64, '/veilleuses/64/1792330416451-IMG_7924.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (73, 22, 'Rouge', '#c70506', NULL, true, '/veilleuses/73/cutout-1789653998016-Image_Codex_17_sept._2026__15_06_19-w1199.webp');
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (65, 22, 'Blanc/Orange', '#ffffff', '#fa730a', true, '/veilleuses/65/cutout-1789662328453-Image_Codex_17_sept._2026__16_55_19-w1199.webp');
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (70, 22, 'Orange/Rose', '#f3741a', '#f97088', true, '/veilleuses/70/cutout-1789670214019-Image_Codex_17_sept._2026__19_36_25-w1199.webp');
insert into public.product_photos (product_color_id, url, position) values (70, '/veilleuses/70/1792330450450-IMG_7925.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (61, 22, 'bleu', '#13a8fe', NULL, true, '/veilleuses/61/cutout-1789653341539-Image_Codex_17_sept._2026__14_55_21-w1199.webp');
insert into public.product_photos (product_color_id, url, position) values (61, '/veilleuses/61/1792330404384-IMG_7912.webp', 0);

-- Okasa
insert into public.products (id, slug, name, description, price) overriding system value values (23, 'okasa', 'Okasa', 'Vous cherchez une déco originale que personne d’autre n’a chez lui ? Okasa est faite pour vous.

Inspirée des samouraïs japonais, cette veilleuse reprend la forme de leur chapeau traditionnel et les plis de leur tenue. Résultat : un objet élégant et différent, qui attire tous les regards dès qu’on entre dans la pièce.

Le soir, allumez-la et laissez sa lumière chaude et douce remplir votre chambre ou votre salon. Fini l’éclairage blanc qui fatigue les yeux. Avec Okasa, vous créez une ambiance calme et cosy, parfaite pour se détendre après une longue journée, discuter autour d’un thé ou s’endormir tranquillement.

Sa finition effet pierre et ses plis bien dessinés lui donnent un rendu haut de gamme, comme les luminaires des magasins de déco à l’étranger, mais à un prix accessible.

C’est aussi une idée cadeau parfaite : pour un anniversaire, un mariage, une nouvelle maison ou simplement pour faire plaisir à quelqu’un qui aime les belles choses. Un cadeau qui sort de l’ordinaire et qu’on garde longtemps.

✨ Design unique inspiré du Japon
✨ Lumière chaude et apaisante
✨ Finition effet pierre, rendu haut de gamme
✨ Idéale pour chambre, salon, bureau ou chambre d’enfant
✨ Fabriquée avec soin, pièce par pièce', 3400);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (87, 23, 'Bleu', '#2abeff', NULL, true, '/veilleuses/87/cutout-1793814894553-76E0F068-ED99-4312-9C18-96A5BC5A9C77.webp');
insert into public.product_photos (product_color_id, url, position) values (87, '/veilleuses/87/1793814899390-ABFB9A22-F0E0-4C57-A68D-7726317842D2.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (86, 23, 'Rose', '#ffc2e5', NULL, true, '/veilleuses/86/cutout-1793722752575-Lampe_pliss_e_rose_poudr_.webp');
insert into public.product_photos (product_color_id, url, position) values (86, '/veilleuses/86/1793719654300-IMG_8472.webp', 0);
insert into public.product_photos (product_color_id, url, position) values (86, '/veilleuses/86/1793719677541-IMG_8468.webp', 1);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (84, 23, 'Orange', '#f88112', NULL, true, '/veilleuses/84/cutout-1793722748693-Lampe_orange_pliss_e_sur_fond_transparent.webp');
insert into public.product_photos (product_color_id, url, position) values (84, '/veilleuses/84/1793719649280-IMG_8470.webp', 0);
insert into public.product_photos (product_color_id, url, position) values (84, '/veilleuses/84/1793719673199-IMG_8467.webp', 1);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (82, 23, 'Blanc', '#ffffff', NULL, true, NULL);
insert into public.product_photos (product_color_id, url, position) values (82, '/veilleuses/82/1793790018186-687D0BCC-F409-45DE-92A9-4351CF7FB117.webp', 0);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (81, 23, 'Marbre', '#dcd6d0', NULL, true, '/veilleuses/81/cutout-1793721344210-Lampe_pliss_e_en_c_ramique_ivoire.webp');
insert into public.product_photos (product_color_id, url, position) values (81, '/veilleuses/81/1793719645210-IMG_8471.webp', 0);
insert into public.product_photos (product_color_id, url, position) values (81, '/veilleuses/81/1793719663365-IMG_8466.webp', 1);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (83, 23, 'noir', '#000000', NULL, true, '/veilleuses/83/cutout-1793722771528-Lampe_noire_pliss_e_moderne.webp');
insert into public.product_photos (product_color_id, url, position) values (83, '/veilleuses/83/1793719628639-IMG_8473.webp', 0);
insert into public.product_photos (product_color_id, url, position) values (83, '/veilleuses/83/1793719639801-IMG_8469.webp', 1);
insert into public.product_colors (id, product_id, color_name, color_hex, color_hex_2, in_stock, cutout_photo_url) overriding system value values (85, 23, 'Rouge', '#f8121d', NULL, true, '/veilleuses/85/cutout-1793728079430-55D80A6A-26F8-4191-9497-9631F00BEACE.webp');
insert into public.product_photos (product_color_id, url, position) values (85, '/veilleuses/85/1793727798885-IMG_8507.webp', 0);
insert into public.product_photos (product_color_id, url, position) values (85, '/veilleuses/85/1793728085302-EC888781-EDA4-4F82-84B8-72E150401347.webp', 2);


-- ═════════════════════════════════════════════════════════════
-- Compteurs
-- ═════════════════════════════════════════════════════════════
-- Reprendre après les identifiants réinsérés ci-dessus.
select setval(pg_get_serial_sequence('public.products', 'id'), 23);
select setval(pg_get_serial_sequence('public.product_colors', 'id'), 87);
select setval(pg_get_serial_sequence('public.product_photos', 'id'), coalesce((select max(id) from public.product_photos), 1));

-- Les commandes démarrent à 1000, et c'est le point important
-- de tout ce fichier : les 186 commandes de l'ancien projet portent les
-- numéros 1 à 186. Si les nouvelles commençaient à 1 elles occuperaient ces
-- numéros, et la réimportation deviendrait impossible sans renuméroter —
-- c'est-à-dire sans mentir à la cliente qui a noté son numéro de commande.
select setval(pg_get_serial_sequence('public.orders', 'id'), 1000, false);

commit;

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
-- ─────────────────────────────────────────────────────────────
