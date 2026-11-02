-- 006: extra fields for branch-based posting (fish market offers, gear shop, workshop services)
alter table public.listings add column if not exists unit text;
alter table public.listings add column if not exists quantity text;
alter table public.listings add column if not exists offer_days smallint;
alter table public.listings add column if not exists product_type text;

alter table public.listings drop constraint if exists listings_offer_days_check;
alter table public.listings add constraint listings_offer_days_check check (offer_days is null or offer_days between 1 and 30);
alter table public.listings drop constraint if exists listings_unit_check;
alter table public.listings add constraint listings_unit_check check (unit is null or unit in ('kg','box','piece','lot'));
alter table public.listings drop constraint if exists listings_product_type_check;
alter table public.listings add constraint listings_product_type_check check (product_type is null or product_type in ('fish','gear','workshop'));
alter table public.listings drop constraint if exists listings_quantity_len_check;
alter table public.listings add constraint listings_quantity_len_check check (quantity is null or char_length(quantity) <= 40);

grant select (unit, quantity, offer_days, product_type) on public.listings to anon, authenticated;
grant insert (unit, quantity, offer_days, product_type) on public.listings to authenticated;
grant update (unit, quantity, offer_days, product_type) on public.listings to authenticated;
