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
