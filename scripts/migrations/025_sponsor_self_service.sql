-- 025: companies of the guides post their own "عروض المصنّعين", within a quota set by the admin.
--
-- sponsors.professional_id  the guide account the placement belongs to (one per account)
-- sponsors.max_offers       how many offers that company may have (admin sets it; the database enforces it)
-- sponsor_offers.created_by the company owner who added the offer (null = added by the admin)
--
-- The owner of the linked account can read his placement (even outside its period) and add / edit / delete
-- its offers. He cannot change the placement itself (period, quota, active): those stay admin-only.
-- His photos go to his own folder of pro-images (<uid>/sponsor/...); the admin's stay in announcements/sponsors/.

alter table public.sponsors
  add column if not exists professional_id uuid references public.professional_profiles(id) on delete set null,
  add column if not exists max_offers integer not null default 0;
do $$ begin
  alter table public.sponsors add constraint sponsors_max_offers check (max_offers between 0 and 50);
exception when duplicate_object then null; end $$;
create unique index if not exists sponsors_professional_uidx on public.sponsors (professional_id) where professional_id is not null;

alter table public.sponsor_offers add column if not exists created_by uuid references auth.users(id) on delete set null;

-- placements of the accounts owned by the caller
create or replace function public.marsa_my_sponsor_ids()
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select s.id from public.sponsors s
  join public.professional_profiles p on p.id = s.professional_id
  where p.owner_id = auth.uid();
$$;
revoke all on function public.marsa_my_sponsor_ids() from public, anon;
grant execute on function public.marsa_my_sponsor_ids() to authenticated;

drop policy if exists sponsors_owner_read on public.sponsors;
create policy sponsors_owner_read on public.sponsors for select to authenticated
  using (id in (select public.marsa_my_sponsor_ids()));

drop policy if exists sponsor_offers_owner on public.sponsor_offers;
create policy sponsor_offers_owner on public.sponsor_offers for all to authenticated
  using (sponsor_id in (select public.marsa_my_sponsor_ids()))
  with check (sponsor_id in (select public.marsa_my_sponsor_ids()));

-- quota, owner stamp, photo folder (the admin is not limited)
create or replace function public.marsa_sponsor_offer_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_max integer; v_n integer; v_uid uuid := auth.uid();
begin
  if v_uid is null or public.is_admin() then return new; end if;
  if tg_op = 'UPDATE' and new.sponsor_id is distinct from old.sponsor_id then
    raise exception 'not allowed: sponsor' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    -- lock the placement so two offers added at the same time cannot both pass the count
    select s.max_offers into v_max from public.sponsors s where s.id = new.sponsor_id for update;
    select count(*) into v_n from public.sponsor_offers o where o.sponsor_id = new.sponsor_id;
    if v_n >= coalesce(v_max, 0) then
      raise exception 'offer_limit' using errcode = 'P0001';
    end if;
    new.created_by := v_uid;
  else
    new.created_by := old.created_by;
  end if;
  -- photos: only files of the owner's own folder (or ones already on the offer)
  if exists (select 1 from unnest(new.images) p
              where not (p like v_uid::text || '/%')
                and not (tg_op = 'UPDATE' and p = any (old.images))) then
    raise exception 'not allowed: image path' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.marsa_sponsor_offer_guard() from public, anon, authenticated;
drop trigger if exists sponsor_offer_guard on public.sponsor_offers;
create trigger sponsor_offer_guard before insert or update on public.sponsor_offers
  for each row execute function public.marsa_sponsor_offer_guard();

-- the company's own visits are not counted either
create or replace function public.track_sponsor(p_sponsor uuid, p_event text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_sponsor is null or p_event not in ('impression', 'view', 'call', 'whatsapp') then return; end if;
  if public.is_admin() then return; end if;
  if auth.uid() is not null and p_sponsor in (select public.marsa_my_sponsor_ids()) then return; end if;
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

-- the company sees its own numbers (same shape as admin_sponsor_stats)
create or replace function public.my_sponsor_stats(p_days integer default 30)
returns json language plpgsql stable security definer set search_path = ''
as $$
declare v_from date := public.marsa_today() - greatest(1, least(coalesce(p_days, 30), 3650)) + 1;
begin
  return (
    select coalesce(json_agg(x), '[]'::json) from (
      select s.id as sponsor_id,
             coalesce(sum(st.n) filter (where st.event = 'impression' and st.day >= v_from), 0) as impressions,
             coalesce(sum(st.n) filter (where st.event = 'view'       and st.day >= v_from), 0) as views,
             coalesce(sum(st.n) filter (where st.event = 'call'       and st.day >= v_from), 0) as calls,
             coalesce(sum(st.n) filter (where st.event = 'whatsapp'   and st.day >= v_from), 0) as whatsapp
        from public.sponsors s
        left join public.sponsor_stats st on st.sponsor_id = s.id
       where s.id in (select public.marsa_my_sponsor_ids())
       group by s.id
    ) x
  );
end $$;
revoke all on function public.my_sponsor_stats(integer) from public, anon;
grant execute on function public.my_sponsor_stats(integer) to authenticated;

-- the admin can remove the photos a company put on its offers (when he deletes the offer or the placement)
drop policy if exists pro_images_admin_delete on storage.objects;
create policy pro_images_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'pro-images' and (select public.marsa_is_admin()));
