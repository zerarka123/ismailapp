-- 020: lighter notifications. Run ONCE in Supabase SQL Editor, then deploy the new send-push function
--      and point the database webhook to the table push_jobs (see README, "Notifications").
--
-- Before: one new ad created one notification row per interested user (~800), and EACH row
--   (a) called the send-push function through the webhook (800 calls, 3 queries each), and
--   (b) went through Supabase Realtime, which checks every row for every user who has the app open.
-- After: the rows are still written (the bell list in the app is unchanged), but
--   (a) the whole batch becomes ONE row in push_jobs -> ONE call of send-push that sends to everyone, and
--   (b) notifications is no longer on Realtime (the app refreshes the bell count itself).
-- Does not change who is notified or what they see. Safe to run again.

-- 1) one row per event: who to notify and what to say
create table if not exists public.push_jobs (
  id bigint generated always as identity primary key,
  type text not null,
  params jsonb not null default '{}',
  path text,
  user_ids uuid[] not null,
  created_at timestamptz not null default now()
);
create index if not exists push_jobs_created_idx on public.push_jobs (created_at);
alter table public.push_jobs enable row level security;
revoke all on public.push_jobs from anon, authenticated; -- only the database and the push function use it

-- 2) after each INSERT statement on notifications (one fan-out = one statement): group the new rows into jobs
create or replace function public.marsa_queue_push()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.push_jobs (type, params, path, user_ids)
  select n.type, n.params, n.path, array_agg(distinct n.user_id)
    from new_rows n
   group by n.type, n.params, n.path;
  delete from public.push_jobs where created_at < now() - interval '3 days'; -- keep the table small
  return null;
exception when others then
  raise warning 'marsa_queue_push: %', sqlerrm; -- never block publishing because of push
  return null;
end $$;
drop trigger if exists marsa_queue_push on public.notifications;
create trigger marsa_queue_push after insert on public.notifications
  referencing new table as new_rows
  for each statement execute function public.marsa_queue_push();

-- 3) every device of a job's users, with each user's language: one query for the whole batch
create or replace function public.marsa_push_job_targets(p_job bigint)
returns table (kind text, user_id uuid, token text, p256dh text, auth text, lang text)
language sql stable security definer set search_path = public as $$
  with r as (select distinct unnest(j.user_ids) as id from public.push_jobs j where j.id = p_job)
  select x.kind, x.user_id, x.token, x.p256dh, x.auth, coalesce(p.preferred_lang, 'ar')
    from (
      select 'fcm'::text as kind, t.user_id, t.token, null::text as p256dh, null::text as auth
        from public.push_tokens t join r on r.id = t.user_id
      union all
      select 'web'::text, w.user_id, w.endpoint, w.p256dh, w.auth
        from public.web_push_subscriptions w join r on r.id = w.user_id
    ) x
    left join public.profiles p on p.id = x.user_id
   order by x.kind, x.token;
$$;
revoke all on function public.marsa_push_job_targets(bigint) from public, anon, authenticated;
grant execute on function public.marsa_push_job_targets(bigint) to service_role;

-- 4) no more Realtime on notifications (it was checking every new row for every open app)
do $$
begin
  if exists (select 1 from pg_publication_tables
              where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime drop table public.notifications;
  end if;
end $$;

-- 5) same rules as before, but auth.uid() runs once per query instead of once per row (like migration 018)
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists notifications_mark on public.notifications;
create policy notifications_mark on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete to authenticated using (user_id = (select auth.uid()));

-- 6) the bell count ("unread") reads only this user's unread rows
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;
analyze public.notifications;
