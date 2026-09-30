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
