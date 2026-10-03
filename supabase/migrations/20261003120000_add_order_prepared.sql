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
