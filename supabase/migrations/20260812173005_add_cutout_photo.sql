-- A dedicated cutout (background-removed) photo per color, separate from
-- the normal product_photos gallery. Hero/catalog/boutique-listing cards
-- prefer this when set; the product detail page keeps showing the normal
-- gallery untouched. Nullable: a color without a cutout yet just falls
-- back to its first normal photo on cards.
alter table public.product_colors add column cutout_photo_url text;
