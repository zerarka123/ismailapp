-- Run ONCE in Supabase SQL Editor. Lets a user edit HIS OWN listing and HIS OWN business profile.
-- (Deleting a listing already works from the app; admin editing stays in the admin panel.)
-- Both functions are SECURITY DEFINER but only ever touch rows owned by auth.uid(); they never change
-- status, kind, owner, category, badge or subscription, so moderation cannot be bypassed.

create or replace function public.update_my_listing(
  p_id text, p_title text, p_description text, p_price numeric, p_wilaya_id int, p_place text,
  p_condition text, p_boat_type_id bigint, p_length numeric, p_year int, p_engine text, p_gear_type text,
  p_phone text, p_whatsapp text)
returns void language plpgsql security definer set search_path = public as $$
declare l public.listings%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into l from public.listings where id::text = p_id and seller_id = auth.uid();
  if not found then raise exception 'not_found'; end if;
  if length(trim(coalesce(p_title, ''))) not between 5 and 120 then raise exception 'bad_title'; end if;
  if p_price is not null and p_price <= 0 then raise exception 'bad_price'; end if;
  if p_condition is not null and p_condition not in ('new', 'used') then raise exception 'bad_condition'; end if;

  update public.listings set
    title        = trim(p_title),
    description  = left(coalesce(p_description, ''), 4000),
    price_dzd    = p_price,
    wilaya_id    = coalesce(p_wilaya_id, wilaya_id),
    place_text   = nullif(left(trim(coalesce(p_place, '')), 150), ''),
    condition    = p_condition,
    boat_type_id = case when l.kind::text = 'boat' then coalesce(p_boat_type_id, boat_type_id) else boat_type_id end,
    length_m     = case when l.kind::text = 'boat' then p_length else length_m end,
    year_built   = case when l.kind::text in ('boat', 'engine') then p_year else year_built end,
    engine_info  = case when l.kind::text in ('boat', 'engine') then nullif(left(trim(coalesce(p_engine, '')), 200), '') else engine_info end,
    gear_type    = case when l.kind::text = 'gear' and p_gear_type in ('spare_part', 'product', 'service') then p_gear_type else gear_type end
  where id = l.id;

  if p_phone is not null then
    update public.listing_contacts set phone = p_phone, whatsapp = p_whatsapp where listing_id = l.id;
    if not found then
      insert into public.listing_contacts (listing_id, phone, whatsapp) values (l.id, p_phone, p_whatsapp);
    end if;
  end if;
end $$;
revoke all on function public.update_my_listing(text, text, text, numeric, int, text, text, bigint, numeric, int, text, text, text, text) from public, anon;
grant execute on function public.update_my_listing(text, text, text, numeric, int, text, text, bigint, numeric, int, text, text, text, text) to authenticated;

create or replace function public.update_my_professional(
  p_business_name text, p_description text, p_wilaya_id int, p_address text,
  p_latitude double precision, p_longitude double precision, p_phone text, p_whatsapp text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if length(trim(coalesce(p_business_name, ''))) not between 2 and 100 then raise exception 'bad_name'; end if;
  update public.professional_profiles set
    business_name = trim(p_business_name),
    description   = left(coalesce(p_description, ''), 3000),
    wilaya_id     = coalesce(p_wilaya_id, wilaya_id),
    address       = nullif(left(trim(coalesce(p_address, '')), 200), ''),
    latitude      = coalesce(p_latitude, latitude),
    longitude     = coalesce(p_longitude, longitude)
  where owner_id = auth.uid();
  if not found then raise exception 'not_found'; end if;
  if p_phone is not null then
    update public.professional_contacts set phone = p_phone, whatsapp = p_whatsapp
     where professional_id in (select id from public.professional_profiles where owner_id = auth.uid());
    if not found then
      insert into public.professional_contacts (professional_id, phone, whatsapp)
      select id, p_phone, p_whatsapp from public.professional_profiles where owner_id = auth.uid();
    end if;
  end if;
end $$;
revoke all on function public.update_my_professional(text, text, int, text, double precision, double precision, text, text) from public, anon;
grant execute on function public.update_my_professional(text, text, int, text, double precision, double precision, text, text) to authenticated;
