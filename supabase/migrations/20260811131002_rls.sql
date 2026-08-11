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
