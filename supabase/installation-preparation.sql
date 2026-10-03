-- À exécuter dans Supabase > SQL Editor. Idempotent, aucune ancienne commande modifiée.
-- Inclut les dates de statut précédemment proposées et la case « Prête ».
alter table public.orders
  add column if not exists confirmed_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists prepared_at timestamptz;
