-- Marsa — migration 003: languages (AR/FR/EN), portfolio photos, new guide branches, fishing-equipment kind,
-- sponsored listings, smart notifications, admin tools (verify / edit / sponsor).
--
-- Run ONCE in the Supabase SQL Editor, after 002_condition_jetski.sql.
-- It only ADDS things: no table, column or row is dropped, existing data is kept as is.
-- Safe to re-run: every statement checks whether it was already applied.

-- ---------------------------------------------------------------------------------------------
-- 0) Helper: is the current user an admin?
-- ---------------------------------------------------------------------------------------------
create or replace function public.marsa_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;
revoke all on function public.marsa_is_admin() from public;
grant execute on function public.marsa_is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 1) Translations for lookup tables (the app falls back to built-in names, then to name_ar)
-- ---------------------------------------------------------------------------------------------
alter table public.wilayas          add column if not exists name_fr text, add column if not exists name_en text;
alter table public.boat_types       add column if not exists name_fr text, add column if not exists name_en text;
alter table public.guide_categories add column if not exists name_fr text, add column if not exists name_en text;
-- public reference data: the app now selects every column of these tables
grant select on public.wilayas, public.boat_types, public.guide_categories to anon, authenticated;

update public.wilayas w set name_fr = v.fr, name_en = coalesce(v.en, v.fr)
from (values
  (1,'Adrar',null),(2,'Chlef',null),(3,'Laghouat',null),(4,'Oum El Bouaghi',null),(5,'Batna',null),(6,'Béjaïa',null),
  (7,'Biskra',null),(8,'Béchar',null),(9,'Blida',null),(10,'Bouira',null),(11,'Tamanrasset',null),(12,'Tébessa',null),
  (13,'Tlemcen',null),(14,'Tiaret',null),(15,'Tizi Ouzou',null),(16,'Alger','Algiers'),(17,'Djelfa',null),(18,'Jijel',null),
  (19,'Sétif',null),(20,'Saïda',null),(21,'Skikda',null),(22,'Sidi Bel Abbès',null),(23,'Annaba',null),(24,'Guelma',null),
  (25,'Constantine',null),(26,'Médéa',null),(27,'Mostaganem',null),(28,'M''Sila',null),(29,'Mascara',null),(30,'Ouargla',null),
  (31,'Oran',null),(32,'El Bayadh',null),(33,'Illizi',null),(34,'Bordj Bou Arréridj',null),(35,'Boumerdès',null),(36,'El Tarf',null),
  (37,'Tindouf',null),(38,'Tissemsilt',null),(39,'El Oued',null),(40,'Khenchela',null),(41,'Souk Ahras',null),(42,'Tipaza',null),
  (43,'Mila',null),(44,'Aïn Defla',null),(45,'Naâma',null),(46,'Aïn Témouchent',null),(47,'Ghardaïa',null),(48,'Relizane',null),
  (49,'Timimoun',null),(50,'Bordj Badji Mokhtar',null),(51,'Ouled Djellal',null),(52,'Béni Abbès',null),(53,'In Salah',null),
  (54,'In Guezzam',null),(55,'Touggourt',null),(56,'Djanet',null),(57,'El M''Ghair',null),(58,'El Meniaa',null)
) as v(id, fr, en)
where w.id = v.id and w.name_fr is null;

update public.guide_categories c set name_fr = v.fr, name_en = v.en
from (values
  ('shipyards','Chantiers navals','Shipyards'),
  ('parts_suppliers','Fournisseurs de pièces','Parts suppliers'),
  ('naval_mechanics','Mécanique navale','Marine mechanics'),
  ('naval_electrics','Électricité navale','Marine electrics'),
  ('gear_shops','Magasins de matériel de pêche','Fishing gear shops'),
  ('fishing_trips','Sorties de pêche','Fishing trips'),
  ('jobs','Emplois maritimes','Maritime jobs')
) as v(slug, fr, en)
where c.slug = v.slug and c.name_fr is null;

update public.boat_types b set name_fr = v.fr, name_en = v.en
from (values ('jet_ski','Jet-ski','Jet ski'), ('other','Autre','Other')) as v(slug, fr, en)
where b.slug = v.slug and b.name_fr is null;

-- ---------------------------------------------------------------------------------------------
-- 2) New guide branches (inox, wood, cold rooms) and the "inflatable boat" type
--    VALUES-based inserts so they also work when "section" is an enum column.
-- ---------------------------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.guide_categories where slug = 'inox_workshops') then
    insert into public.guide_categories (section, slug, name_ar, name_fr, name_en, sort_order)
    values ('marine', 'inox_workshops', 'ورشات الإينوكس', 'Ateliers inox', 'Stainless steel workshops',
            (select coalesce(max(sort_order), 0) + 1 from public.guide_categories));
  end if;
  if not exists (select 1 from public.guide_categories where slug = 'wood_workshops') then
    insert into public.guide_categories (section, slug, name_ar, name_fr, name_en, sort_order)
    values ('marine', 'wood_workshops', 'ورشات الخشب ونجارة السفن', 'Ateliers bois & charpente navale', 'Wood & boat carpentry workshops',
            (select coalesce(max(sort_order), 0) + 1 from public.guide_categories));
  end if;
  if not exists (select 1 from public.guide_categories where slug = 'cold_rooms') then
    insert into public.guide_categories (section, slug, name_ar, name_fr, name_en, sort_order)
    values ('fisher', 'cold_rooms', 'غرف التبريد', 'Chambres froides', 'Cold rooms',
            (select coalesce(max(sort_order), 0) + 1 from public.guide_categories));
  end if;
  if not exists (select 1 from public.boat_types where slug in ('inflatable', 'zodiac') or name_ar like '%مطاط%' or name_ar like '%زودياك%') then
    insert into public.boat_types (slug, name_ar, name_fr, name_en, sort_order)
    values ('inflatable', 'قارب مطاطي', 'Bateau pneumatique', 'Inflatable boat', 8);
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 3) Listings: product sub-type, sponsored placement, and the new market kind "equipment"
-- ---------------------------------------------------------------------------------------------
alter table public.listings add column if not exists gear_type text check (gear_type in ('spare_part', 'product', 'service'));
alter table public.listings add column if not exists sponsored_until timestamptz;
grant select (gear_type, sponsored_until) on public.listings to anon, authenticated;
grant insert (gear_type) on public.listings to authenticated;
grant update (gear_type) on public.listings to authenticated;
create index if not exists listings_sponsored_idx on public.listings (sponsored_until) where sponsored_until is not null;

-- kind = 'equipment' (fishing & navigation equipment, open to every user). Works whether "kind" is an enum
-- or a text column with a CHECK constraint listing the allowed values.
do $$
declare
  typ oid;
  r record;
begin
  select a.atttypid into typ from pg_attribute a where a.attrelid = 'public.listings'::regclass and a.attname = 'kind';
  if exists (select 1 from pg_type t where t.oid = typ and t.typtype = 'e') then
    execute format('alter type %s add value if not exists %L', typ::regtype, 'equipment');
  else
    for r in
      select c.conname, pg_get_constraintdef(c.oid) as def
      from pg_constraint c
      where c.conrelid = 'public.listings'::regclass and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ~ '\mkind\M'
        and pg_get_constraintdef(c.oid) like '%ANY (ARRAY[%'          -- an allowed-values list only
        and pg_get_constraintdef(c.oid) like '%''boat''%' and pg_get_constraintdef(c.oid) like '%''gear''%'
        and pg_get_constraintdef(c.oid) not like '%''equipment''%'
    loop
      execute format('alter table public.listings drop constraint %I', r.conname);
      execute format('alter table public.listings add constraint %I %s', r.conname,
        regexp_replace(r.def, '''gear''::([a-z ]+)', '''gear''::\1, ''equipment''::\1'));
    end loop;
  end if;
end $$;

-- Only admins may change sponsored_until (the column has no insert/update grant, this is a second lock)
create or replace function public.marsa_guard_sponsor()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT' and new.sponsored_until is not null)
     or (tg_op = 'UPDATE' and new.sponsored_until is distinct from old.sponsored_until) then
    if auth.uid() is not null and not public.marsa_is_admin() then
      raise exception 'not_admin';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists marsa_guard_sponsor on public.listings;
create trigger marsa_guard_sponsor before insert or update on public.listings
  for each row execute function public.marsa_guard_sponsor();

create or replace function public.admin_set_listing_sponsored(p_id text, p_days int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.marsa_is_admin() then raise exception 'not_admin'; end if;
  update public.listings
     set sponsored_until = case when coalesce(p_days, 0) > 0
                                then greatest(coalesce(sponsored_until, now()), now()) + make_interval(days => least(p_days, 365))
                                else null end
   where id::text = p_id;
  if not found then raise exception 'not_found'; end if;
end $$;
revoke all on function public.admin_set_listing_sponsored(text, int) from public, anon;
grant execute on function public.admin_set_listing_sponsored(text, int) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 4) Admin: verified badge + edit any business profile
-- ---------------------------------------------------------------------------------------------
create or replace function public.admin_set_badge(p_id text, p_verified boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.marsa_is_admin() then raise exception 'not_admin'; end if;
  update public.professional_profiles set badge_verified = coalesce(p_verified, false) where id::text = p_id;
  if not found then raise exception 'not_found'; end if;
end $$;
revoke all on function public.admin_set_badge(text, boolean) from public, anon;
grant execute on function public.admin_set_badge(text, boolean) to authenticated;

create or replace function public.admin_update_professional(
  p_id text, p_business_name text, p_description text, p_category_id bigint, p_wilaya_id int,
  p_address text, p_phone text, p_whatsapp text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.marsa_is_admin() then raise exception 'not_admin'; end if;
  if length(trim(coalesce(p_business_name, ''))) not between 2 and 100 then raise exception 'bad_name'; end if;
  update public.professional_profiles
     set business_name = trim(p_business_name),
         description   = left(coalesce(p_description, ''), 3000),
         category_id   = coalesce(p_category_id, category_id),
         wilaya_id     = coalesce(p_wilaya_id, wilaya_id),
         address       = nullif(left(trim(coalesce(p_address, '')), 200), '')
   where id::text = p_id;
  if not found then raise exception 'not_found'; end if;
  if p_phone is not null then
    update public.professional_contacts set phone = p_phone, whatsapp = p_whatsapp where professional_id::text = p_id;
    if not found then
      insert into public.professional_contacts (professional_id, phone, whatsapp)
      select id, p_phone, p_whatsapp from public.professional_profiles where id::text = p_id;
    end if;
  end if;
end $$;
revoke all on function public.admin_update_professional(text, text, text, bigint, int, text, text, text) from public, anon;
grant execute on function public.admin_update_professional(text, text, text, bigint, int, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 5) Portfolio photos (gallery of each business; videos stay in portfolio_videos)
--    professional_id takes the same type as professional_profiles.id
-- ---------------------------------------------------------------------------------------------
do $$
declare idtype text;
begin
  if to_regclass('public.portfolio_photos') is null then
    select format_type(a.atttypid, a.atttypmod) into idtype
    from pg_attribute a where a.attrelid = 'public.professional_profiles'::regclass and a.attname = 'id';
    execute format($f$
      create table public.portfolio_photos (
        id uuid primary key default gen_random_uuid(),
        owner_id uuid not null references auth.users(id) on delete cascade,
        professional_id %s not null references public.professional_profiles(id) on delete cascade,
        storage_path text not null,
        caption text check (char_length(caption) <= 120),
        created_at timestamptz not null default now()
      )$f$, idtype);
  end if;
end $$;
create index if not exists portfolio_photos_pro_idx on public.portfolio_photos (professional_id, created_at desc);
alter table public.portfolio_photos enable row level security;

drop policy if exists portfolio_photos_read on public.portfolio_photos;
create policy portfolio_photos_read on public.portfolio_photos for select using (
  owner_id = auth.uid()
  or exists (select 1 from public.professional_profiles p where p.id = professional_id and p.status = 'active')
);
drop policy if exists portfolio_photos_insert on public.portfolio_photos;
create policy portfolio_photos_insert on public.portfolio_photos for insert to authenticated with check (
  owner_id = auth.uid()
  and storage_path like auth.uid()::text || '/%'
  and exists (select 1 from public.professional_profiles p where p.id = professional_id and p.owner_id = auth.uid() and p.status = 'active')
);
drop policy if exists portfolio_photos_delete on public.portfolio_photos;
create policy portfolio_photos_delete on public.portfolio_photos for delete to authenticated using (
  owner_id = auth.uid() or public.marsa_is_admin()
);
grant select on public.portfolio_photos to anon, authenticated;
grant insert (owner_id, professional_id, storage_path, caption), delete on public.portfolio_photos to authenticated;

create or replace function public.marsa_photo_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.portfolio_photos where professional_id = new.professional_id) >= 30 then
    raise exception 'photo_limit_reached';
  end if;
  return new;
end $$;
drop trigger if exists marsa_photo_limit on public.portfolio_photos;
create trigger marsa_photo_limit before insert on public.portfolio_photos
  for each row execute function public.marsa_photo_limit();

-- ---------------------------------------------------------------------------------------------
-- 6) Smart notifications
-- ---------------------------------------------------------------------------------------------
alter table public.profiles add column if not exists preferred_lang text not null default 'ar'
  check (preferred_lang in ('ar', 'fr', 'en'));
grant update (preferred_lang) on public.profiles to authenticated;

-- what each user wants to hear about (market kinds + followed guide branches, optional wilaya filter)
create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  kinds text[] not null default array['boat', 'engine', 'equipment'],
  category_ids bigint[] not null default '{}',
  wilaya_id int,
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
drop policy if exists notification_prefs_own on public.notification_prefs;
create policy notification_prefs_own on public.notification_prefs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.notification_prefs to authenticated;

-- device tokens for Firebase Cloud Messaging (written only through the RPCs below)
create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'android',
  updated_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
drop policy if exists push_tokens_own on public.push_tokens;
create policy push_tokens_own on public.push_tokens for select to authenticated using (user_id = auth.uid());
grant select on public.push_tokens to authenticated;

create or replace function public.register_push_token(p_token text, p_platform text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_token is null or length(p_token) not between 20 and 4096 then raise exception 'bad_token'; end if;
  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (p_token, auth.uid(), left(coalesce(p_platform, 'android'), 20), now())
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end $$;
revoke all on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

create or replace function public.unregister_push_token(p_token text)
returns void language sql security definer set search_path = public as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;
revoke all on function public.unregister_push_token(text) from public, anon;
grant execute on function public.unregister_push_token(text) to authenticated;

-- inbox: one row per user per event. Text is NOT stored: the app / push function renders type+params
-- in the reader's language.
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  params jsonb not null default '{}',
  path text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists notifications_mark on public.notifications;
create policy notifications_mark on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete to authenticated using (user_id = auth.uid());
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- live delivery to the open app
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- default interests: every existing user (opt-out model: regular users get boats/engines/equipment,
-- businesses also follow their own branch). Existing rows are left untouched.
insert into public.notification_prefs (user_id, category_ids)
select pr.id,
       coalesce((select array_agg(distinct pp.category_id::bigint) from public.professional_profiles pp where pp.owner_id = pr.id and pp.category_id is not null), '{}')
from public.profiles pr
join auth.users u on u.id = pr.id
on conflict (user_id) do nothing;

create or replace function public.marsa_default_prefs()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notification_prefs (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
exception when others then
  return new; -- never block sign-up
end $$;
drop trigger if exists marsa_default_prefs on public.profiles;
create trigger marsa_default_prefs after insert on public.profiles
  for each row execute function public.marsa_default_prefs();

-- a business automatically follows its own branch
create or replace function public.marsa_follow_own_branch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.category_id is not null then
    insert into public.notification_prefs (user_id, category_ids) values (new.owner_id, array[new.category_id::bigint])
    on conflict (user_id) do update
      set category_ids = case when new.category_id::bigint = any(notification_prefs.category_ids) then notification_prefs.category_ids
                              else notification_prefs.category_ids || new.category_id::bigint end;
  end if;
  return new;
exception when others then
  return new;
end $$;
drop trigger if exists marsa_follow_own_branch on public.professional_profiles;
create trigger marsa_follow_own_branch after insert or update of category_id on public.professional_profiles
  for each row execute function public.marsa_follow_own_branch();

-- Fan-out when a listing is complete. The app inserts listing_contacts as the LAST step of publishing
-- (after the photos), so this never notifies about a listing whose upload failed and was rolled back.
create or replace function public.marsa_notify_new_listing()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  l record;
  v_cat bigint;
  v_slug text;
  v_cat_ar text;
  v_biz text;
  v_path text;
begin
  select id, kind::text as kind, title, seller_id, wilaya_id, status::text as status
    into l from public.listings where id = new.listing_id;
  if not found or l.status <> 'published' then return new; end if;
  v_path := '/listing/' || l.id::text;

  if l.kind = 'gear' then
    -- product / service of a business: tell the followers of its branch
    select pp.category_id, gc.slug, gc.name_ar, pp.business_name into v_cat, v_slug, v_cat_ar, v_biz
      from public.professional_profiles pp
      left join public.guide_categories gc on gc.id = pp.category_id
     where pp.owner_id = l.seller_id
     order by (pp.status::text = 'active') desc
     limit 1;
    if v_cat is null then return new; end if;
    insert into public.notifications (user_id, type, params, path)
    select np.user_id, 'new_product',
           jsonb_build_object('title', l.title, 'branch', v_slug, 'branch_ar', v_cat_ar, 'business', v_biz), v_path
      from public.notification_prefs np
     where np.enabled and np.user_id <> l.seller_id and v_cat = any(np.category_ids)
     limit 5000;
  else
    -- market and job listings: users interested in this kind (and wilaya, if they chose one)
    insert into public.notifications (user_id, type, params, path)
    select np.user_id, 'new_listing', jsonb_build_object('title', l.title, 'kind', l.kind, 'wilaya_id', l.wilaya_id), v_path
      from public.notification_prefs np
     where np.enabled and np.user_id <> l.seller_id and l.kind = any(np.kinds)
       and (np.wilaya_id is null or np.wilaya_id = l.wilaya_id)
     limit 5000;
  end if;
  return new;
exception when others then
  raise warning 'marsa_notify_new_listing: %', sqlerrm; -- never block publishing because of notifications
  return new;
end $$;
drop trigger if exists marsa_notify_new_listing on public.listing_contacts;
create trigger marsa_notify_new_listing after insert on public.listing_contacts
  for each row execute function public.marsa_notify_new_listing();

-- New portfolio work (photo or video): followers of the branch, at most once per hour per business
create or replace function public.marsa_notify_new_work()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_pro record;
begin
  select pp.id, pp.category_id, pp.business_name, gc.slug, gc.name_ar as cat_ar into v_pro
    from public.professional_profiles pp
    left join public.guide_categories gc on gc.id = pp.category_id
   where pp.owner_id = new.owner_id and pp.status::text = 'active'
   limit 1;
  if not found or v_pro.category_id is null then return new; end if;
  insert into public.notifications (user_id, type, params, path)
  select np.user_id, 'new_work',
         jsonb_build_object('business', v_pro.business_name, 'branch', v_pro.slug, 'branch_ar', v_pro.cat_ar),
         '/pro/' || v_pro.id::text
    from public.notification_prefs np
   where np.enabled and np.user_id <> new.owner_id and v_pro.category_id::bigint = any(np.category_ids)
     and not exists (select 1 from public.notifications n
                      where n.user_id = np.user_id and n.type = 'new_work' and n.path = '/pro/' || v_pro.id::text
                        and n.created_at > now() - interval '1 hour')
   limit 5000;
  return new;
exception when others then
  raise warning 'marsa_notify_new_work: %', sqlerrm;
  return new;
end $$;
drop trigger if exists marsa_notify_new_work on public.portfolio_photos;
create trigger marsa_notify_new_work after insert on public.portfolio_photos
  for each row execute function public.marsa_notify_new_work();
do $$
begin
  if to_regclass('public.portfolio_videos') is not null then
    drop trigger if exists marsa_notify_new_work on public.portfolio_videos;
    create trigger marsa_notify_new_work after insert on public.portfolio_videos
      for each row execute function public.marsa_notify_new_work();
  end if;
end $$;

-- Housekeeping you can schedule (Database → Cron) or run by hand: keep 90 days of notifications
create or replace function public.marsa_prune_notifications()
returns void language sql security definer set search_path = public as $$
  delete from public.notifications where created_at < now() - interval '90 days';
$$;
revoke all on function public.marsa_prune_notifications() from public, anon, authenticated;
