-- 017: price currency (dinar, euro, dollar). Run ONCE in Supabase SQL Editor, BEFORE deploying the new front end.
-- Adds only: one column (every existing ad stays in dinars), a wider price check, and a new version of
-- update_my_listing that also saves the currency. Safe to run again.

alter table public.listings
  add column if not exists price_currency text not null default 'DZD';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'listings_price_currency_check') then
    alter table public.listings
      add constraint listings_price_currency_check check (price_currency in ('DZD', 'EUR', 'USD'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'listings_price_range_check') then
    alter table public.listings
      add constraint listings_price_range_check check (price_dzd is null or (price_dzd > 0 and price_dzd < 1000000000000)) not valid;
  end if;
end $$;

-- The old 14-argument version is replaced by one with p_currency (null = keep the current currency).
-- Old app versions that do not send p_currency keep working through the default value.
drop function if exists public.update_my_listing(text, text, text, numeric, int, text, text, bigint, numeric, int, text, text, text, text);

create or replace function public.update_my_listing(
  p_id text, p_title text, p_description text, p_price numeric, p_wilaya_id int, p_place text,
  p_condition text, p_boat_type_id bigint, p_length numeric, p_year int, p_engine text, p_gear_type text,
  p_phone text, p_whatsapp text, p_currency text default null)
returns void language plpgsql security definer set search_path = public as $$
declare l public.listings%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into l from public.listings where id::text = p_id and seller_id = auth.uid();
  if not found then raise exception 'not_found'; end if;
  if length(trim(coalesce(p_title, ''))) not between 5 and 120 then raise exception 'bad_title'; end if;
  if p_price is not null and (p_price <= 0 or p_price >= 1000000000000) then raise exception 'bad_price'; end if;
  if p_condition is not null and p_condition not in ('new', 'used') then raise exception 'bad_condition'; end if;
  if p_currency is not null and p_currency not in ('DZD', 'EUR', 'USD') then raise exception 'bad_price'; end if;

  update public.listings set
    title          = trim(p_title),
    description    = left(coalesce(p_description, ''), 4000),
    price_dzd      = p_price,
    price_currency = coalesce(p_currency, price_currency),
    wilaya_id      = coalesce(p_wilaya_id, wilaya_id),
    place_text     = nullif(left(trim(coalesce(p_place, '')), 150), ''),
    condition      = p_condition,
    boat_type_id   = case when l.kind::text = 'boat' then coalesce(p_boat_type_id, boat_type_id) else boat_type_id end,
    length_m       = case when l.kind::text = 'boat' then p_length else length_m end,
    year_built     = case when l.kind::text in ('boat', 'engine') then p_year else year_built end,
    engine_info    = case when l.kind::text in ('boat', 'engine') then nullif(left(trim(coalesce(p_engine, '')), 200), '') else engine_info end,
    gear_type      = case when l.kind::text = 'gear' and p_gear_type in ('spare_part', 'product', 'service') then p_gear_type else gear_type end
  where id = l.id;

  if p_phone is not null then
    update public.listing_contacts set phone = p_phone, whatsapp = p_whatsapp where listing_id = l.id;
    if not found then
      insert into public.listing_contacts (listing_id, phone, whatsapp) values (l.id, p_phone, p_whatsapp);
    end if;
  end if;
end $$;
revoke all on function public.update_my_listing(text, text, text, numeric, int, text, text, bigint, numeric, int, text, text, text, text, text) from public, anon;
grant execute on function public.update_my_listing(text, text, text, numeric, int, text, text, bigint, numeric, int, text, text, text, text, text) to authenticated;

-- Public site (marsadz.app): sponsored ads also show their currency. New column added at the end of the view.
create or replace view public.site_sponsored as
select l.id, l.title, l.price_dzd, l.kind::text as kind, l.published_at,
       w.name_ar as wilaya_ar,
       (select li.storage_path from public.listing_images li where li.listing_id = l.id order by li.sort_order limit 1) as cover_path,
       l.price_currency
from public.listings l
left join public.wilayas w on w.id = l.wilaya_id
where l.status::text = 'published'
  and l.expires_at > now()
  and l.sponsored_until is not null and l.sponsored_until > now();
grant select on public.site_sponsored to anon, authenticated;

notify pgrst, 'reload schema';
