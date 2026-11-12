-- Marsa — migration 013: admin control over users' listings ("التحكم في إعلانات المستخدمين")
--
-- Run ONCE in the Supabase SQL Editor, after 012_announcements.sql.
-- It only ADDS admin-only functions and 4 storage policies. No table, column or existing function is changed.
-- Safe to re-run.
--
-- What the admin panel can do with it (tab «إعلانات المستخدمين»):
--   * see every listing (published, hidden, sold, expired), search and filter
--   * move a listing to another section of the market (boat type / engines / equipment) or another wilaya
--   * change its position in the feed (one step up / down, or straight to the top)
--   * hide it / show it again
--   * delete it for good (rows + photos)

-- ---------------------------------------------------------------------------------------------
-- 1) List (any status). Same order as the app feed: bumped_at desc.
--    p_kind:   null | boat | engine | equipment | fish | gear | job_offer | job_request
--    p_status: null | published (live) | expired | hidden | sold | removed
-- ---------------------------------------------------------------------------------------------
create or replace function public.admin_list_listings(
  p_q text default null, p_kind text default null, p_status text default null,
  p_limit int default 30, p_offset int default 0)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  res json;
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
begin
  if not public.marsa_is_admin() then raise exception 'not_admin'; end if;
  if v_q is not null then
    v_q := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;
  select coalesce(json_agg(x), '[]'::json) into res from (
    select l.id, l.title, l.kind::text as kind, l.status::text as status, l.price_dzd,
           l.boat_type_id, l.wilaya_id, l.seller_id, l.seller_name,
           to_jsonb(l) ->> 'gear_type' as gear_type,
           to_jsonb(l) ->> 'product_type' as product_type,
           l.published_at, l.bumped_at, l.expires_at,
           (to_jsonb(l) ->> 'sponsored_until')::timestamptz as sponsored_until,
           (select li.storage_path from public.listing_images li
             where li.listing_id = l.id order by li.sort_order limit 1) as cover_path
      from public.listings l
     where (v_q is null or l.title ilike v_q or l.seller_name ilike v_q)
       and (p_kind is null
            or (p_kind = 'fish' and l.kind::text = 'equipment' and to_jsonb(l) ->> 'product_type' = 'fish')
            or (p_kind = 'equipment' and l.kind::text = 'equipment' and coalesce(to_jsonb(l) ->> 'product_type', '') <> 'fish')
            or (p_kind not in ('fish', 'equipment') and l.kind::text = p_kind))
       and (p_status is null
            or (p_status = 'published' and l.status::text = 'published' and l.expires_at > now())
            or (p_status = 'expired' and l.status::text = 'published' and l.expires_at <= now())
            or (p_status not in ('published', 'expired') and l.status::text = p_status))
     order by l.bumped_at desc nulls last, l.id
     limit least(greatest(coalesce(p_limit, 30), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0)
  ) x;
  return res;
end $$;
revoke all on function public.admin_list_listings(text, text, text, int, int) from public, anon;
grant execute on function public.admin_list_listings(text, text, text, int, int) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2) Move to another section of the open market and / or another wilaya.
--    p_kind: boat (needs p_boat_type_id) | engine | equipment.  p_wilaya_id null = keep the wilaya.
--    The listing leaves any special branch it was in (fish market / pro products) and becomes a normal market ad.
--    (format %L writes the kind as a literal, so it works whether listings.kind is an enum or text.)
-- ---------------------------------------------------------------------------------------------
create or replace function public.admin_move_listing(p_id text, p_kind text, p_boat_type_id bigint default null, p_wilaya_id bigint default null)
returns void language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.marsa_is_admin() then raise exception 'not_admin'; end if;
  if p_kind is null or p_kind not in ('boat', 'engine', 'equipment') then raise exception 'bad_kind'; end if;
  if p_kind = 'boat' and not exists (select 1 from public.boat_types bt where bt.id = p_boat_type_id) then
    raise exception 'bad_boat_type';
  end if;
  if p_wilaya_id is not null and not exists (select 1 from public.wilayas w where w.id = p_wilaya_id) then
    raise exception 'bad_wilaya';
  end if;
  execute format(
    'update public.listings
        set kind = %L,
            boat_type_id = $2,
            wilaya_id = coalesce($3, wilaya_id),
            gear_type = null,
            product_type = null
      where id::text = $1', p_kind)
    using p_id, case when p_kind = 'boat' then p_boat_type_id end, p_wilaya_id;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'not_found'; end if;
end $$;
revoke all on function public.admin_move_listing(text, text, bigint, bigint) from public, anon;
grant execute on function public.admin_move_listing(text, text, bigint, bigint) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3) Position in the feed (the feed is ordered by bumped_at desc)
-- ---------------------------------------------------------------------------------------------
-- Straight to the top
create or replace function public.admin_listing_to_top(p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.marsa_is_admin() then raise exception 'not_admin'; end if;
  update public.listings set bumped_at = now() where id::text = p_id;
  if not found then raise exception 'not_found'; end if;
end $$;
revoke all on function public.admin_listing_to_top(text) from public, anon;
grant execute on function public.admin_listing_to_top(text) to authenticated;

-- Put listing p_above just above listing p_below (they exchange their places in the feed)
create or replace function public.admin_swap_listings(p_above text, p_below text)
returns void language plpgsql security definer set search_path = public as $$
declare a timestamptz; b timestamptz; hi timestamptz; lo timestamptz;
begin
  if not public.marsa_is_admin() then raise exception 'not_admin'; end if;
  select bumped_at into a from public.listings where id::text = p_above;
  if not found then raise exception 'not_found'; end if;
  select bumped_at into b from public.listings where id::text = p_below;
  if not found then raise exception 'not_found'; end if;
  hi := greatest(coalesce(a, b, now()), coalesce(b, a, now()));
  lo := least(coalesce(a, b, now()), coalesce(b, a, now()));
  if hi = lo then hi := hi + interval '1 millisecond'; end if;
  update public.listings set bumped_at = hi where id::text = p_above;
  update public.listings set bumped_at = lo where id::text = p_below;
end $$;
revoke all on function public.admin_swap_listings(text, text) from public, anon;
grant execute on function public.admin_swap_listings(text, text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 4) Hide / show again
-- ---------------------------------------------------------------------------------------------
create or replace function public.admin_set_listing_hidden(p_id text, p_hidden boolean)
returns void language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.marsa_is_admin() then raise exception 'not_admin'; end if;
  execute format('update public.listings set status = %L where id::text = $1',
                 case when coalesce(p_hidden, true) then 'hidden' else 'published' end)
    using p_id;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'not_found'; end if;
end $$;
revoke all on function public.admin_set_listing_hidden(text, boolean) from public, anon;
grant execute on function public.admin_set_listing_hidden(text, boolean) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 5) Delete for good. Returns the stored files so the app can remove them from Storage afterwards.
-- ---------------------------------------------------------------------------------------------
create or replace function public.admin_delete_listing(p_id text)
returns json language plpgsql security definer set search_path = public as $$
declare l public.listings%rowtype; res json;
begin
  if not public.marsa_is_admin() then raise exception 'not_admin'; end if;
  select * into l from public.listings where id::text = p_id;
  if not found then raise exception 'not_found'; end if;
  select json_build_object(
    'images', coalesce((select json_agg(li.storage_path) from public.listing_images li where li.listing_id = l.id), '[]'::json),
    'video', to_jsonb(l) ->> 'video_path'
  ) into res;
  delete from public.listings where id = l.id;
  return res;
end $$;
revoke all on function public.admin_delete_listing(text) from public, anon;
grant execute on function public.admin_delete_listing(text) to authenticated;

-- Admins may remove the photos / video of a deleted listing from Storage
drop policy if exists listing_images_admin_read on storage.objects;
create policy listing_images_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'listing-images' and (select public.marsa_is_admin()));
drop policy if exists listing_images_admin_delete on storage.objects;
create policy listing_images_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and (select public.marsa_is_admin()));
drop policy if exists portfolio_videos_admin_read on storage.objects;
create policy portfolio_videos_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'portfolio-videos' and (select public.marsa_is_admin()));
drop policy if exists portfolio_videos_admin_delete on storage.objects;
create policy portfolio_videos_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio-videos' and (select public.marsa_is_admin()));
