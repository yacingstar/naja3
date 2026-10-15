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
