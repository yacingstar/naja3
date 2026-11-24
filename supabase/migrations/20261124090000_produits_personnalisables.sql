-- Les produits à plusieurs couleurs : l'horloge Duo, et ce qui suivra.
--
-- Naja ne vend plus seulement des veilleuses. La première horloge s'imprime
-- en trois pièces — fond arrière, fond avant, repères et aiguilles — et la
-- cliente choisit la couleur de chacune. Dix teintes sur trois pièces font
-- mille combinaisons : impossible d'en faire mille lignes dans
-- product_colors, et hors de question de photographier mille horloges.
--
-- LE CHOIX DE CONCEPTION, en une phrase : le modèle existant ne bouge pas.
-- order_items.product_color_id reste un FK simple et NOT NULL — le produit
-- personnalisable garde une ligne product_colors unique, qui porte son prix
-- et ses photos comme n'importe quel coloris — et le choix réel de la
-- cliente est figé à côté, dans une colonne jsonb. Rien de ce qui lit une
-- commande aujourd'hui ne se casse ; tout ce qui veut montrer les trois
-- couleurs lit une colonne de plus.
--
-- La même raison qu'à la migration 20260917200001 (la lampe bicolore) : le
-- duo est resté une ligne plutôt que de devenir deux.

-- ── La palette ───────────────────────────────────────────────────────────
-- Commune à tout le site, et non par produit : une bobine est une bobine.
-- Quand elle en achète une, elle l'ajoute ici et elle est proposée sur tous
-- les produits personnalisables d'un coup.
create table public.filament_colors (
  id bigint generated always as identity primary key,
  name text not null unique,
  hex text not null,
  in_stock boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index filament_colors_position_idx on public.filament_colors (position, name);

-- ── Les pièces d'un produit ──────────────────────────────────────────────
-- `slot` dit au dessin quelle partie teinter (voir HorlogeApercu.tsx) ;
-- `label` est ce que la cliente lit. Un produit sans ligne ici est un
-- produit normal, à un seul coloris : c'est le cas de toutes les veilleuses,
-- et c'est ce qui fait que cette migration ne change rien pour elles.
create table public.product_parts (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  slot text not null,
  label text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, slot)
);
create index product_parts_product_idx on public.product_parts (product_id, position);

-- Quel dessin montrer à la place d'une photo. NULL = produit photographié,
-- comme avant.
alter table public.products add column preview text;

-- ── Le choix de la cliente, figé ─────────────────────────────────────────
-- Un instantané, pas un lien : si elle renomme « Rose bonbon » ou retire une
-- bobine du catalogue l'an prochain, une commande déjà passée doit continuer
-- de dire ce qui a été commandé. Même principe que delivery_fee sur orders.
-- Forme : [{"slot":"fond","label":"Fond arrière","name":"Vert foncé","hex":"#1b4d2e"}, …]
alter table public.order_items add column custom_colors jsonb;

-- ── RLS et droits, à l'identique des tables du catalogue ────────────────
alter table public.filament_colors enable row level security;
alter table public.product_parts enable row level security;

create policy "filament_colors readable by everyone"
  on public.filament_colors for select
  to anon, authenticated
  using (true);

create policy "product_parts readable by everyone"
  on public.product_parts for select
  to anon, authenticated
  using (true);

grant select on public.filament_colors, public.product_parts to anon, authenticated;
grant select, insert, update, delete on public.filament_colors, public.product_parts to service_role;

-- ── Les dix bobines du jour ──────────────────────────────────────────────
-- Les teintes sont approchées : elles viennent des coloris déjà en base pour
-- celles qui existaient (rouge, orange, violet…) et d'une estimation pour
-- les autres. Elles se corrigent à la main dans filament_colors sans toucher
-- au code — c'est tout l'intérêt d'avoir sorti la palette de là.
insert into public.filament_colors (name, hex, position) values
  ('Noir',        '#1c1c1c',  0),
  ('Blanc',       '#f4f2ed', 10),
  ('Vert clair',  '#46b65a', 20),
  ('Vert foncé',  '#1b4d2e', 30),
  ('Rouge',       '#e4001e', 40),
  ('Orange',      '#f88112', 50),
  ('Violet',      '#8a17a9', 60),
  ('Bleu',        '#1356c9', 70),
  ('Rose',        '#ef85ae', 80),
  ('Rose bonbon', '#ff5fa2', 90);
