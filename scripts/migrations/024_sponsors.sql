-- 024: "عروض المصنّعين" — paid placements of boat manufacturers (and other companies).
--
-- sponsors        one company: logo, name, short line, description, phone / WhatsApp, place, paid period
-- sponsor_offers  its offers (boats): title, price, length, engine, photos
-- sponsor_stats   daily counters for the report sent to the company: impressions (seen on the home
--                 strip), page views, calls, WhatsApp taps
--
-- Only the admin writes (RLS + is_admin()). Everyone (visitors too) reads the companies that are active
-- inside their paid period. Photos go to the existing admin-only "announcements" bucket, folder sponsors/.
-- Table grants are explicit: this project does not grant new tables to anon/authenticated by default.

create table if not exists public.sponsors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 2 and 100),
  tagline     text check (tagline is null or char_length(tagline) <= 140),
  description text check (description is null or char_length(description) <= 3000),
  logo_path   text check (logo_path is null or char_length(logo_path) <= 300),
  phone       text check (phone is null or phone ~ '^\+?[0-9]{8,15}$'),
  whatsapp    text check (whatsapp is null or whatsapp ~ '^\+?[0-9]{8,15}$'),
  wilaya_id   smallint references public.wilayas(id),
  address     text check (address is null or char_length(address) <= 200),
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint sponsors_period check (ends_at > starts_at)
);

create table if not exists public.sponsor_offers (
  id             uuid primary key default gen_random_uuid(),
  sponsor_id     uuid not null references public.sponsors(id) on delete cascade,
  title          text not null check (char_length(btrim(title)) between 2 and 100),
  description    text check (description is null or char_length(description) <= 2000),
  price_dzd      numeric check (price_dzd is null or (price_dzd >= 0 and price_dzd <= 1e12)),
  price_currency text not null default 'DZD' check (price_currency in ('DZD', 'EUR', 'USD')),
  length_m       numeric check (length_m is null or (length_m > 0 and length_m <= 200)),
  engine         text check (engine is null or char_length(engine) <= 100),
  images         text[] not null default '{}' check (cardinality(images) <= 8),
  is_active      boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists sponsor_offers_sponsor_idx on public.sponsor_offers (sponsor_id, sort_order);

create table if not exists public.sponsor_stats (
  day        date not null,
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  event      text not null check (event in ('impression', 'view', 'call', 'whatsapp')),
  n          integer not null default 0,
  primary key (day, sponsor_id, event)
);
create index if not exists sponsor_stats_sponsor_idx on public.sponsor_stats (sponsor_id, day);

drop trigger if exists sponsors_updated on public.sponsors;
create trigger sponsors_updated before update on public.sponsors for each row execute function public.set_updated_at();

alter table public.sponsors enable row level security;
alter table public.sponsor_offers enable row level security;
alter table public.sponsor_stats enable row level security;   -- no policy: only the functions below touch it

drop policy if exists sponsors_read on public.sponsors;
create policy sponsors_read on public.sponsors for select to anon, authenticated
  using ((is_active and now() >= starts_at and now() < ends_at) or (select public.is_admin()));
drop policy if exists sponsors_admin on public.sponsors;
create policy sponsors_admin on public.sponsors for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists sponsor_offers_read on public.sponsor_offers;
create policy sponsor_offers_read on public.sponsor_offers for select to anon, authenticated
  using (
    (is_active and exists (select 1 from public.sponsors s
                            where s.id = sponsor_offers.sponsor_id and s.is_active
                              and now() >= s.starts_at and now() < s.ends_at))
    or (select public.is_admin()));
drop policy if exists sponsor_offers_admin on public.sponsor_offers;
create policy sponsor_offers_admin on public.sponsor_offers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.sponsors, public.sponsor_offers, public.sponsor_stats from anon, authenticated;
grant select on public.sponsors, public.sponsor_offers to anon, authenticated;
grant insert, update, delete on public.sponsors, public.sponsor_offers to authenticated;   -- admin only (RLS)

-- One counter tick. Only for a live company; the admin's own visits (testing) are not counted.
create or replace function public.track_sponsor(p_sponsor uuid, p_event text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_sponsor is null or p_event not in ('impression', 'view', 'call', 'whatsapp') then return; end if;
  if public.is_admin() then return; end if;
  if not exists (select 1 from public.sponsors s
                  where s.id = p_sponsor and s.is_active and now() >= s.starts_at and now() < s.ends_at) then
    return;
  end if;
  insert into public.sponsor_stats as st (day, sponsor_id, event, n)
  values (public.marsa_today(), p_sponsor, p_event, 1)
  on conflict (day, sponsor_id, event) do update set n = st.n + 1;
end $$;
revoke all on function public.track_sponsor(uuid, text) from public;
grant execute on function public.track_sponsor(uuid, text) to anon, authenticated;

-- Admin report: counters per company over the last p_days days, and since the start.
create or replace function public.admin_sponsor_stats(p_days integer default 30)
returns json language plpgsql stable security definer set search_path = ''
as $$
declare v_from date := public.marsa_today() - greatest(1, least(coalesce(p_days, 30), 3650)) + 1;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return (
    select coalesce(json_agg(x), '[]'::json) from (
      select s.id as sponsor_id,
             coalesce(sum(st.n) filter (where st.event = 'impression' and st.day >= v_from), 0) as impressions,
             coalesce(sum(st.n) filter (where st.event = 'view'       and st.day >= v_from), 0) as views,
             coalesce(sum(st.n) filter (where st.event = 'call'       and st.day >= v_from), 0) as calls,
             coalesce(sum(st.n) filter (where st.event = 'whatsapp'   and st.day >= v_from), 0) as whatsapp,
             coalesce(sum(st.n) filter (where st.event = 'impression'), 0) as total_impressions,
             coalesce(sum(st.n) filter (where st.event = 'view'), 0)       as total_views,
             coalesce(sum(st.n) filter (where st.event = 'call'), 0)       as total_calls,
             coalesce(sum(st.n) filter (where st.event = 'whatsapp'), 0)   as total_whatsapp
        from public.sponsors s
        left join public.sponsor_stats st on st.sponsor_id = s.id
       group by s.id
    ) x
  );
end $$;
revoke all on function public.admin_sponsor_stats(integer) from public, anon;
grant execute on function public.admin_sponsor_stats(integer) to authenticated;
