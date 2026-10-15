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
