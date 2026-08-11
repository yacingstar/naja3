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
