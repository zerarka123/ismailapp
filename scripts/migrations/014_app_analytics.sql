-- Marsa — migration 014: app analytics («لوحة الإحصائيات» in the admin panel)
--
-- Run ONCE in the Supabase SQL Editor, after 013_admin_listings_control.sql. Safe to re-run.
-- It only ADDS 4 small tables and some functions. No existing table, column, policy or function is changed.
--
-- What is recorded (all writes go through the functions below; the tables themselves are closed to the app):
--   * app_activity_daily  one row per device per day (Algeria time): opens of the app, signed-in user if any
--   * user_last_seen      one row per user: last time the app was opened
--   * contact_clicks      one row per tap on a "call" or "WhatsApp" button, with the branch, the item and the screen
--   * item_views          one counter per item per day (opened listing / account page / fish request)
--
-- Egress: the app only sends tiny calls that return nothing, and the admin panel receives ready-made totals
-- (a few KB of JSON), never the raw rows.

-- ---------------------------------------------------------------------------------------------
-- 1) Tables
-- ---------------------------------------------------------------------------------------------
create table if not exists public.app_activity_daily (
  day        date not null,
  device_id  uuid not null,
  user_id    uuid references auth.users(id) on delete set null,
  platform   text not null default 'web' check (platform in ('android', 'ios', 'web', 'pwa')),
  opens      int  not null default 1,
  first_at   timestamptz not null default now(),
  last_at    timestamptz not null default now(),
  primary key (day, device_id)
);
create index if not exists app_activity_daily_user_idx on public.app_activity_daily (user_id, day) where user_id is not null;
create index if not exists app_activity_daily_last_idx on public.app_activity_daily (last_at);

create table if not exists public.user_last_seen (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  platform     text
);
create index if not exists user_last_seen_at_idx on public.user_last_seen (last_seen_at desc);

create table if not exists public.contact_clicks (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  user_id      uuid references auth.users(id) on delete set null,
  channel      text not null check (channel in ('call', 'whatsapp')),
  target_type  text not null check (target_type in ('listing', 'pro', 'fish_request', 'fish_offer')),
  target_id    text not null check (char_length(target_id) <= 64),
  branch       text not null check (char_length(branch) <= 40),
  listing_kind text check (listing_kind is null or char_length(listing_kind) <= 20),
  owner_id     uuid,
  screen       text not null default 'other' check (char_length(screen) <= 30)
);
create index if not exists contact_clicks_created_idx on public.contact_clicks (created_at);
create index if not exists contact_clicks_branch_idx on public.contact_clicks (branch, created_at);
create index if not exists contact_clicks_target_idx on public.contact_clicks (target_type, target_id);
create index if not exists contact_clicks_user_idx on public.contact_clicks (user_id, created_at);

create table if not exists public.item_views (
  day         date not null,
  target_type text not null check (target_type in ('listing', 'pro', 'fish_request')),
  target_id   text not null check (char_length(target_id) <= 64),
  branch      text not null,
  views       int  not null default 0,
  user_views  int  not null default 0,
  primary key (day, target_type, target_id)
);
create index if not exists item_views_branch_idx on public.item_views (branch, day);

-- Closed to the app: only the functions below (security definer) read or write these tables.
alter table public.app_activity_daily enable row level security;
alter table public.user_last_seen     enable row level security;
alter table public.contact_clicks     enable row level security;
alter table public.item_views         enable row level security;
revoke all on public.app_activity_daily, public.user_last_seen, public.contact_clicks, public.item_views from anon, authenticated;

-- "Today" for Marsa = the day in Algeria
create or replace function public.marsa_today()
returns date language sql stable set search_path = public as $$
  select (now() at time zone 'Africa/Algiers')::date;
$$;

-- ---------------------------------------------------------------------------------------------
-- 2) Which branch / owner an item belongs to
--    Branches = guide_categories.slug (fishermen, gear_shops, cold_rooms, shipyards, naval_mechanics, inox_workshops ...)
--    plus: market (boats, engines, equipment ads), jobs, fish_requests, other.
--    naval_electrics is counted inside naval_mechanics, like in the app.
-- ---------------------------------------------------------------------------------------------
create or replace function public.marsa_norm_branch(p text)
returns text language sql immutable as $$
  select case when p = 'naval_electrics' then 'naval_mechanics' else coalesce(nullif(p, ''), 'other') end;
$$;

create or replace function public.marsa_resolve_target(p_type text, p_id text, p_hint text,
  out branch text, out owner_id uuid, out listing_kind text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_kind text; v_product text; v_seller uuid;
  v_hint text := case when p_hint is not null and exists (select 1 from public.guide_categories gc where gc.slug = p_hint)
                      then p_hint end;
begin
  if p_type = 'listing' then
    select l.kind::text, to_jsonb(l) ->> 'product_type', l.seller_id into v_kind, v_product, v_seller
      from public.listings l where l.id::text = p_id;
    if not found then return; end if;
    owner_id := v_seller;
    listing_kind := case when v_kind = 'equipment' and v_product = 'fish' then 'fish' else v_kind end;
    if v_kind in ('job_offer', 'job_request') then
      branch := 'jobs';
    elsif v_kind in ('boat', 'engine') or (v_kind = 'equipment' and coalesce(v_product, '') <> 'fish') then
      branch := 'market';
    else
      -- products of a professional account (and fish ads): the branch the visitor was browsing, else from the ad itself
      branch := coalesce(
        v_hint,
        case when v_kind = 'equipment' and v_product = 'fish' then 'fishermen'
             when v_product = 'fish' then 'cold_rooms'
             when v_product = 'gear' then 'gear_shops' end,
        (select gc.slug from public.professional_profiles pp
           join public.guide_categories gc on gc.id = pp.category_id
          where pp.owner_id = v_seller
          order by (pp.status::text = 'active') desc, pp.created_at
          limit 1),
        'other');
    end if;
  elsif p_type = 'pro' then
    select gc.slug, pp.owner_id into branch, owner_id
      from public.professional_profiles pp
      left join public.guide_categories gc on gc.id = pp.category_id
     where pp.id::text = p_id;
    if not found then return; end if;
  elsif p_type = 'fish_request' then
    select r.user_id into owner_id from public.fish_requests r where r.id::text = p_id;
    if not found then return; end if;
    branch := 'fish_requests';
  elsif p_type = 'fish_offer' then
    select o.seller_id into owner_id from public.fish_offers o where o.id::text = p_id;
    if not found then return; end if;
    branch := 'fish_requests';
  else
    return;
  end if;
  branch := public.marsa_norm_branch(branch);
end $$;
revoke all on function public.marsa_resolve_target(text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3) Calls made by the app (tiny, return nothing)
-- ---------------------------------------------------------------------------------------------
-- App opened / came back to the foreground. The app calls it at most every 30 minutes per device.
create or replace function public.track_app_open(p_device uuid, p_platform text default 'web')
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_platform text := case when p_platform in ('android', 'ios', 'web', 'pwa') then p_platform else 'web' end;
begin
  if p_device is null then return; end if;
  insert into public.app_activity_daily as a (day, device_id, user_id, platform)
  values (public.marsa_today(), p_device, v_uid, v_platform)
  on conflict (day, device_id) do update
     set opens = a.opens + 1,
         last_at = now(),
         user_id = coalesce(excluded.user_id, a.user_id),
         platform = excluded.platform;
  if v_uid is not null then
    insert into public.user_last_seen as s (user_id, last_seen_at, platform)
    values (v_uid, now(), v_platform)
    on conflict (user_id) do update set last_seen_at = now(), platform = excluded.platform;
  end if;
end $$;
revoke all on function public.track_app_open(uuid, text) from public;
grant execute on function public.track_app_open(uuid, text) to anon, authenticated;

-- Tap on a call / WhatsApp button (contacts are shown to signed-in users only).
-- p_screen: where the button was (listing, pro_page, pro_quick, cold_offers, fisher_offers, fish_request ...)
-- p_branch: the branch the user was browsing, when the screen knows it (optional)
create or replace function public.track_contact(p_channel text, p_target_type text, p_target_id text,
  p_screen text default null, p_branch text default null)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  r record;
begin
  if v_uid is null or p_channel not in ('call', 'whatsapp')
     or p_target_type not in ('listing', 'pro', 'fish_request', 'fish_offer')
     or p_target_id is null or char_length(p_target_id) > 64 then
    return;
  end if;
  -- the same tap twice in a few seconds counts once
  if exists (select 1 from public.contact_clicks c
              where c.user_id = v_uid and c.target_type = p_target_type and c.target_id = p_target_id
                and c.channel = p_channel and c.created_at > now() - interval '20 seconds') then
    return;
  end if;
  select * into r from public.marsa_resolve_target(p_target_type, p_target_id, p_branch);
  if r.branch is null then return; end if;
  -- the owner contacting himself (testing his own buttons) is not counted
  if r.owner_id = v_uid then return; end if;
  insert into public.contact_clicks (user_id, channel, target_type, target_id, branch, listing_kind, owner_id, screen)
  values (v_uid, p_channel, p_target_type, p_target_id, r.branch, r.listing_kind, r.owner_id,
          left(coalesce(nullif(regexp_replace(coalesce(p_screen, ''), '[^a-z_]', '', 'g'), ''), 'other'), 30));
end $$;
revoke all on function public.track_contact(text, text, text, text, text) from public;
grant execute on function public.track_contact(text, text, text, text, text) to authenticated;

-- An item page was opened (the app sends it once per item per session).
create or replace function public.track_view(p_target_type text, p_target_id text, p_branch text default null)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  r record;
  v_signed int := case when auth.uid() is null then 0 else 1 end;
begin
  if p_target_type not in ('listing', 'pro', 'fish_request') or p_target_id is null or char_length(p_target_id) > 64 then
    return;
  end if;
  select * into r from public.marsa_resolve_target(p_target_type, p_target_id, p_branch);
  if r.branch is null then return; end if;
  if auth.uid() is not null and r.owner_id = auth.uid() then return; end if;
  insert into public.item_views as v (day, target_type, target_id, branch, views, user_views)
  values (public.marsa_today(), p_target_type, p_target_id, r.branch, 1, v_signed)
  on conflict (day, target_type, target_id) do update
     set views = v.views + 1, user_views = v.user_views + v_signed;
end $$;
revoke all on function public.track_view(text, text, text) from public;
grant execute on function public.track_view(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 4) Admin panel: ready-made totals
-- ---------------------------------------------------------------------------------------------
-- Overview. p_days = period of the contact figures (1, 7, 30, 90).
create or replace function public.admin_app_stats(p_days int default 7)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_days  int  := least(greatest(coalesce(p_days, 7), 1), 365);
  v_today date := public.marsa_today();
  v_day0  timestamptz := (v_today::timestamp at time zone 'Africa/Algiers');  -- start of today in Algeria
  v_from  timestamptz := now() - make_interval(days => v_days);
  v_prev  timestamptz := now() - make_interval(days => 2 * v_days);
  res json;
begin
  if not public.marsa_is_admin() then raise exception 'not_admin'; end if;

  with
  act as (select * from public.app_activity_daily where day > v_today - 120),
  users as (select u.id, u.created_at, (u.created_at at time zone 'Africa/Algiers')::date as d from auth.users u),
  clicks as (select * from public.contact_clicks where created_at > v_prev),
  -- active days per signed-in user over the last 28 days
  reg as (select user_id, count(distinct day) as n from act where user_id is not null and day > v_today - 28 group by user_id),
  daily_act as (
    select day, count(*) as devices, count(distinct user_id) as users
      from act where day > v_today - 30 group by day),
  daily_new as (select d as day, count(*) as n from users where d > v_today - 30 group by d),
  daily_clicks as (
    select (created_at at time zone 'Africa/Algiers')::date as day, count(*) as n
      from public.contact_clicks where created_at > now() - interval '31 days' group by 1),
  cohorts as (
    select date_trunc('week', u.d)::date as wk, u.id, u.d from users u
     where u.d > v_today - 7 * 9
       and u.d >= coalesce((select min(day) from public.app_activity_daily), v_today)),
  cohort_stats as (
    select c.wk, count(*) as size,
      count(*) filter (where exists (select 1 from act a where a.user_id = c.id and a.day between c.d + 1 and c.d + 7))   as w1,
      count(*) filter (where exists (select 1 from act a where a.user_id = c.id and a.day between c.d + 8 and c.d + 14))  as w2,
      count(*) filter (where exists (select 1 from act a where a.user_id = c.id and a.day between c.d + 22 and c.d + 28))  as w4,
      count(*) filter (where exists (select 1 from public.contact_clicks k
                                      where k.user_id = c.id and k.created_at < (c.d + 8)::timestamp at time zone 'Africa/Algiers')) as activated
      from cohorts c group by c.wk),
  branch_views as (
    select branch, sum(views) as views, sum(user_views) as user_views
      from public.item_views where day > v_today - v_days group by branch)
  select json_build_object(
    'tracking_since', (select min(day) from public.app_activity_daily),
    'today', v_today,
    'users', json_build_object(
      'total',  (select count(*) from users),
      'new_today', (select count(*) from users where created_at >= v_day0),
      'new_7d', (select count(*) from users where created_at > now() - interval '7 days'),
      'new_30d', (select count(*) from users where created_at > now() - interval '30 days'),
      'never_seen', (select count(*) from users u where not exists (select 1 from public.user_last_seen s where s.user_id = u.id))),
    'active', json_build_object(
      'users_today',   (select count(distinct user_id) from act where day = v_today),
      'devices_today', (select count(*) from act where day = v_today),
      'users_24h',     (select count(distinct user_id) from act where last_at > now() - interval '24 hours'),
      'devices_24h',   (select count(distinct device_id) from act where last_at > now() - interval '24 hours'),
      'users_7d',      (select count(distinct user_id) from act where day > v_today - 7),
      'devices_7d',    (select count(distinct device_id) from act where day > v_today - 7),
      'users_30d',     (select count(distinct user_id) from act where day > v_today - 30),
      'devices_30d',   (select count(distinct device_id) from act where day > v_today - 30),
      'avg_dau_7d',    (select round(coalesce(sum(users), 0)::numeric / 7, 1) from daily_act where day > v_today - 7),
      'opens_7d',      (select coalesce(sum(opens), 0) from act where day > v_today - 7),
      'at_risk',       (select count(distinct a.user_id) from act a
                         where a.user_id is not null and a.day between v_today - 27 and v_today - 14
                           and not exists (select 1 from act b where b.user_id = a.user_id and b.day > v_today - 14))),
    'regularity', json_build_object(
      'd1',    (select count(*) from reg where n = 1),
      'd2_3',  (select count(*) from reg where n between 2 and 3),
      'd4_7',  (select count(*) from reg where n between 4 and 7),
      'd8_14', (select count(*) from reg where n between 8 and 14),
      'd15',   (select count(*) from reg where n >= 15)),
    'platforms', (select coalesce(json_object_agg(platform, n), '{}'::json)
                    from (select platform, count(distinct device_id) as n from act where day > v_today - 7 group by platform) p),
    'daily', (select coalesce(json_agg(json_build_object(
                  'day', g.day,
                  'devices', coalesce(a.devices, 0),
                  'users', coalesce(a.users, 0),
                  'new_users', coalesce(n.n, 0),
                  'contacts', coalesce(k.n, 0)) order by g.day), '[]'::json)
                from (select (v_today - i) as day from generate_series(0, 29) i) g
                left join daily_act a on a.day = g.day
                left join daily_new n on n.day = g.day
                left join daily_clicks k on k.day = g.day),
    'cohorts', (select coalesce(json_agg(json_build_object(
                  'week', wk, 'size', size, 'activated', activated,
                  'w1', case when v_today >= wk + 6 + 7  then w1 end,
                  'w2', case when v_today >= wk + 6 + 14 then w2 end,
                  'w4', case when v_today >= wk + 6 + 28 then w4 end) order by wk desc), '[]'::json)
                  from cohort_stats),
    'contacts', json_build_object(
      'days', v_days,
      'total',    (select count(*) from clicks where created_at > v_from),
      'calls',    (select count(*) from clicks where created_at > v_from and channel = 'call'),
      'whatsapp', (select count(*) from clicks where created_at > v_from and channel = 'whatsapp'),
      'users',    (select count(distinct user_id) from clicks where created_at > v_from),
      'prev_total', (select count(*) from clicks where created_at <= v_from),
      'by_branch', (select coalesce(json_agg(x order by x.total desc, x.branch), '[]'::json) from (
          select b.branch,
                 coalesce(k.calls, 0) as calls, coalesce(k.whatsapp, 0) as whatsapp, coalesce(k.total, 0) as total,
                 coalesce(k.users, 0) as users, coalesce(k.prev_total, 0) as prev_total,
                 coalesce(v.views, 0) as views, coalesce(v.user_views, 0) as user_views
            from (select gc.slug as branch from public.guide_categories gc where gc.slug <> 'naval_electrics'
                  union select unnest(array['market', 'fish_requests'])
                  union select distinct branch from clicks
                  union select branch from branch_views) b
            left join (select branch,
                              count(*) filter (where created_at > v_from and channel = 'call') as calls,
                              count(*) filter (where created_at > v_from and channel = 'whatsapp') as whatsapp,
                              count(*) filter (where created_at > v_from) as total,
                              count(distinct user_id) filter (where created_at > v_from) as users,
                              count(*) filter (where created_at <= v_from) as prev_total
                         from clicks group by branch) k on k.branch = b.branch
            left join branch_views v on v.branch = b.branch) x),
      'by_screen', (select coalesce(json_object_agg(screen, n), '{}'::json)
                      from (select screen, count(*) as n from clicks where created_at > v_from group by screen) s),
      'by_listing_kind', (select coalesce(json_object_agg(listing_kind, n), '{}'::json)
                      from (select listing_kind, count(*) as n from clicks
                             where created_at > v_from and branch = 'market' and listing_kind is not null group by listing_kind) s))
  ) into res;
  return res;
end $$;
revoke all on function public.admin_app_stats(int) from public, anon;
grant execute on function public.admin_app_stats(int) to authenticated;

-- One branch in detail: its items ranked by contacts, the accounts nobody contacted, screens and days.
create or replace function public.admin_branch_stats(p_branch text, p_days int default 7)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_days  int  := least(greatest(coalesce(p_days, 7), 1), 365);
  v_today date := public.marsa_today();
  v_from  timestamptz := now() - make_interval(days => v_days);
  v_branch text := public.marsa_norm_branch(p_branch);
  res json;
begin
  if not public.marsa_is_admin() then raise exception 'not_admin'; end if;

  with
  clicks as (select * from public.contact_clicks where branch = v_branch and created_at > v_from),
  views as (select target_type, target_id, sum(views) as views, sum(user_views) as user_views
              from public.item_views where branch = v_branch and day > v_today - v_days
             group by target_type, target_id),
  -- a fish offer belongs to its seller: show it under the seller's name
  per_target as (
    select target_type, target_id, max(owner_id::text)::uuid as owner_id,
           count(*) filter (where channel = 'call') as calls,
           count(*) filter (where channel = 'whatsapp') as whatsapp,
           count(*) as total, count(distinct user_id) as users
      from clicks group by target_type, target_id),
  ranked as (
    select coalesce(p.target_type, v.target_type) as target_type, coalesce(p.target_id, v.target_id) as target_id,
           p.owner_id, coalesce(p.calls, 0) as calls, coalesce(p.whatsapp, 0) as whatsapp,
           coalesce(p.total, 0) as total, coalesce(p.users, 0) as users,
           coalesce(v.views, 0) as views, coalesce(v.user_views, 0) as user_views
      from per_target p
      full join views v on v.target_type = p.target_type and v.target_id = p.target_id
     order by coalesce(p.total, 0) desc, coalesce(v.views, 0) desc
     limit 50)
  select json_build_object(
    'branch', v_branch,
    'days', v_days,
    'total',    (select count(*) from clicks),
    'calls',    (select count(*) from clicks where channel = 'call'),
    'whatsapp', (select count(*) from clicks where channel = 'whatsapp'),
    'users',    (select count(distinct user_id) from clicks),
    'views',    (select coalesce(sum(user_views), 0) from views),
    'items', (select coalesce(json_agg(json_build_object(
                'type', r.target_type, 'id', r.target_id,
                'title', case r.target_type
                           when 'listing' then (select l.title from public.listings l where l.id::text = r.target_id)
                           when 'pro' then (select pp.business_name from public.professional_profiles pp where pp.id::text = r.target_id)
                           when 'fish_request' then (select fr.item from public.fish_requests fr where fr.id::text = r.target_id)
                           when 'fish_offer' then (select fr.item from public.fish_offers fo join public.fish_requests fr on fr.id = fo.request_id
                                                    where fo.id::text = r.target_id)
                         end,
                'owner', (select coalesce(
                            (select pp.business_name from public.professional_profiles pp where pp.owner_id = r.owner_id
                              order by (pp.status::text = 'active') desc, pp.created_at limit 1),
                            (select pr.full_name from public.profiles pr where pr.id = r.owner_id))),
                'calls', r.calls, 'whatsapp', r.whatsapp, 'total', r.total, 'users', r.users,
                'views', r.views, 'user_views', r.user_views)), '[]'::json) from ranked r),
    -- live accounts of a guide branch that nobody contacted in the period
    'silent', (select coalesce(json_agg(json_build_object(
                  'id', pp.id::text, 'name', pp.business_name,
                  'views', coalesce((select sum(v.user_views) from views v where v.target_type = 'pro' and v.target_id = pp.id::text), 0))
                  order by pp.created_at desc), '[]'::json)
                 from public.professional_profiles pp
                 join public.guide_categories gc on gc.id = pp.category_id
                where public.marsa_norm_branch(gc.slug) = v_branch
                  and pp.status::text = 'active'
                  and (pp.subscription_ends_at is null or pp.subscription_ends_at > now())
                  and not exists (select 1 from clicks c where c.owner_id = pp.owner_id)),
    'by_screen', (select coalesce(json_object_agg(screen, n), '{}'::json)
                    from (select screen, count(*) as n from clicks group by screen) s),
    'daily', (select coalesce(json_agg(json_build_object('day', g.day, 'calls', coalesce(k.calls, 0), 'whatsapp', coalesce(k.wa, 0)) order by g.day), '[]'::json)
                from (select (v_today - i) as day from generate_series(0, least(v_days, 90) - 1) i) g
                left join (select (created_at at time zone 'Africa/Algiers')::date as day,
                                  count(*) filter (where channel = 'call') as calls,
                                  count(*) filter (where channel = 'whatsapp') as wa
                             from clicks group by 1) k on k.day = g.day)
  ) into res;
  return res;
end $$;
revoke all on function public.admin_branch_stats(text, int) from public, anon;
grant execute on function public.admin_branch_stats(text, int) to authenticated;

-- Users and their last visit. p_filter: all | active7 | inactive14 | never
create or replace function public.admin_users_activity(p_q text default null, p_filter text default 'all',
  p_limit int default 30, p_offset int default 0)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := public.marsa_today();
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
  res json;
begin
  if not public.marsa_is_admin() then raise exception 'not_admin'; end if;
  if v_q is not null then
    v_q := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  with base as (
    select u.id, u.email::text as email, u.created_at, s.last_seen_at, s.platform,
           -- last sign-in (kept by Supabase Auth): a hint for users not seen since tracking started
           (to_jsonb(u) ->> 'last_sign_in_at')::timestamptz as last_sign_in_at,
           pr.full_name, pr.phone, pr.user_type::text as user_type
      from auth.users u
      left join public.user_last_seen s on s.user_id = u.id
      left join public.profiles pr on pr.id = u.id
     where (v_q is null or pr.full_name ilike v_q or u.email ilike v_q or pr.phone ilike v_q)
       and case coalesce(p_filter, 'all')
             when 'active7' then s.last_seen_at > now() - interval '7 days'
             when 'inactive14' then s.last_seen_at <= now() - interval '14 days'
             when 'never' then s.last_seen_at is null
             else true end)
  select json_build_object(
    'count', (select count(*) from base),
    'rows', (select coalesce(json_agg(x), '[]'::json) from (
        select b.id, b.full_name, b.email, b.phone, b.user_type, b.created_at, b.last_seen_at, b.platform, b.last_sign_in_at,
               (select count(distinct a.day) from public.app_activity_daily a
                 where a.user_id = b.id and a.day > v_today - 30) as days_30,
               (select count(*) from public.contact_clicks c
                 where c.user_id = b.id and c.created_at > now() - interval '30 days') as contacts_30
          from base b
         order by b.last_seen_at desc nulls last, b.created_at desc
         limit least(greatest(coalesce(p_limit, 30), 1), 100)
        offset greatest(coalesce(p_offset, 0), 0)) x)
  ) into res;
  return res;
end $$;
revoke all on function public.admin_users_activity(text, text, int, int) from public, anon;
grant execute on function public.admin_users_activity(text, text, int, int) to authenticated;
