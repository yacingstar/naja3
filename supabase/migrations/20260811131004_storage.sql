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
