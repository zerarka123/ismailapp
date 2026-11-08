-- Marsa — migration 012: admin announcements ("إعلانات الإدارة")
--
-- Run ONCE in the Supabase SQL Editor, after 011_fish_market.sql.
-- It only ADDS things (2 tables, 1 storage bucket, a few functions and policies). Nothing existing is changed or dropped.
-- Safe to re-run.
--
-- Audience keys (announcements.audience is an array, several can be chosen together):
--   all        every account
--   members    accounts with no row in professional_profiles (regular users)
--   fisherman | craftsman | supplier | shop_owner | mechanic   = professional_profiles.pro_type of the account

-- ---------------------------------------------------------------------------------------------
-- 1) Announcements
-- ---------------------------------------------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 80),
  body text not null default '' check (char_length(body) <= 2000),
  media_type text not null default 'none' check (media_type in ('none', 'image', 'video')),
  media_url text check (media_url is null or (char_length(media_url) <= 1000 and media_url ~ '^https://')),
  audience text[] not null default array['all']
    check (cardinality(audience) between 1 and 7
           and audience <@ array['all', 'members', 'fisherman', 'craftsman', 'supplier', 'shop_owner', 'mechanic']),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  -- delivery report, written by the send-announcement Edge Function
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
  recipients int,
  devices int,
  sent int,
  failed int,
  constraint announcements_media_check check ((media_type = 'none') = (media_url is null))
);
create index if not exists announcements_created_idx on public.announcements (created_at desc);
alter table public.announcements enable row level security;

-- Audience keys of the current user (anonymous visitors: only "all")
create or replace function public.marsa_my_audience()
returns text[] language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then array['all']
    else array['all'] || coalesce(
      (select array_agg(distinct pp.pro_type::text) from public.professional_profiles pp where pp.owner_id = auth.uid()),
      array['members'])
  end;
$$;
revoke all on function public.marsa_my_audience() from public;
grant execute on function public.marsa_my_audience() to anon, authenticated;

drop policy if exists announcements_read on public.announcements;
create policy announcements_read on public.announcements for select using (
  (status <> 'failed' and audience && (select public.marsa_my_audience()))
  or (select public.marsa_is_admin())
);
drop policy if exists announcements_admin_insert on public.announcements;
create policy announcements_admin_insert on public.announcements for insert to authenticated with check ((select public.marsa_is_admin()));
drop policy if exists announcements_admin_update on public.announcements;
create policy announcements_admin_update on public.announcements for update to authenticated
  using ((select public.marsa_is_admin())) with check ((select public.marsa_is_admin()));
drop policy if exists announcements_admin_delete on public.announcements;
create policy announcements_admin_delete on public.announcements for delete to authenticated using ((select public.marsa_is_admin()));

grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated; -- still limited to admins by the policies above

-- ---------------------------------------------------------------------------------------------
-- 2) Who has seen which announcement (the pop-up shows each announcement once per user)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);
create index if not exists announcement_reads_user_idx on public.announcement_reads (user_id);
alter table public.announcement_reads enable row level security;

drop policy if exists announcement_reads_own on public.announcement_reads;
create policy announcement_reads_own on public.announcement_reads for select to authenticated
  using (user_id = auth.uid() or (select public.marsa_is_admin()));
grant select on public.announcement_reads to authenticated;

-- written only through this function (no direct insert)
create or replace function public.mark_announcement_read(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.announcement_reads (announcement_id, user_id)
  select a.id, auth.uid() from public.announcements a
   where a.id = p_id and a.status <> 'failed' and a.audience && public.marsa_my_audience()
  on conflict do nothing;
end $$;
revoke all on function public.mark_announcement_read(uuid) from public, anon;
grant execute on function public.mark_announcement_read(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3) Audience → users → devices (used by the Edge Function with the service role, never by the app)
-- ---------------------------------------------------------------------------------------------
create or replace function public.marsa_announcement_recipients(p_audience text[])
returns setof uuid language sql stable security definer set search_path = public as $$
  select pr.id
    from public.profiles pr
   where 'all' = any(p_audience)
      or ('members' = any(p_audience)
          and not exists (select 1 from public.professional_profiles pp where pp.owner_id = pr.id))
      or exists (select 1 from public.professional_profiles pp
                  where pp.owner_id = pr.id and pp.pro_type::text = any(p_audience));
$$;
revoke all on function public.marsa_announcement_recipients(text[]) from public, anon, authenticated;
grant execute on function public.marsa_announcement_recipients(text[]) to service_role;

-- Every device of the audience: Android (FCM token) and installed PWA / browser (Web Push).
-- Ordered so the Edge Function can read it page by page (.range()).
create or replace function public.marsa_announcement_targets(p_audience text[])
returns table (kind text, user_id uuid, token text, p256dh text, auth text)
language sql stable security definer set search_path = public as $$
  with r as (select * from public.marsa_announcement_recipients(p_audience) as id)
  select * from (
    select 'fcm'::text, t.user_id, t.token, null::text, null::text
      from public.push_tokens t join r on r.id = t.user_id
    union all
    select 'web'::text, w.user_id, w.endpoint, w.p256dh, w.auth
      from public.web_push_subscriptions w join r on r.id = w.user_id
  ) x (kind, user_id, token, p256dh, auth)
  order by kind, token;
$$;
revoke all on function public.marsa_announcement_targets(text[]) from public, anon, authenticated;
grant execute on function public.marsa_announcement_targets(text[]) to service_role;

-- Reach of an audience, for the admin preview ("سيصل إلى N مستخدم / N جهاز")
create or replace function public.admin_announcement_reach(p_audience text[])
returns json language plpgsql stable security definer set search_path = public as $$
declare res json;
begin
  if not (public.marsa_is_admin() or coalesce(auth.jwt() ->> 'role', '') = 'service_role') then
    raise exception 'not_admin';
  end if;
  with r as (select * from public.marsa_announcement_recipients(p_audience) as id)
  select json_build_object(
    'users',   (select count(*) from r),
    'android', (select count(*) from public.push_tokens t join r on r.id = t.user_id),
    'web',     (select count(*) from public.web_push_subscriptions w join r on r.id = w.user_id)
  ) into res;
  return res;
end $$;
revoke all on function public.admin_announcement_reach(text[]) from public, anon;
grant execute on function public.admin_announcement_reach(text[]) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- 4) Storage: public bucket "announcements" (images + videos up to 20 MB). Only admins upload / delete.
-- ---------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('announcements', 'announcements', true, 20971520,
        array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists announcements_media_admin_read on storage.objects;
create policy announcements_media_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'announcements' and (select public.marsa_is_admin()));
drop policy if exists announcements_media_admin_insert on storage.objects;
create policy announcements_media_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'announcements' and (select public.marsa_is_admin()));
drop policy if exists announcements_media_admin_update on storage.objects;
create policy announcements_media_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'announcements' and (select public.marsa_is_admin()))
  with check (bucket_id = 'announcements' and (select public.marsa_is_admin()));
drop policy if exists announcements_media_admin_delete on storage.objects;
create policy announcements_media_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'announcements' and (select public.marsa_is_admin()));
-- Reading files needs no policy: the bucket is public, files are served by their public URL.
