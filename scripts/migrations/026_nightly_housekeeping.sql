-- 026: nightly housekeeping so the database stays small as users grow.
-- Safe to run again (idempotent).
--   notifications       read ones after 30 days, every one after 90 days (was a manual function, never scheduled)
--   app_activity_daily  raw per-device rows after 120 days (admin stats look back 90 days at most)
--   item_views          daily counters after 400 days
-- track_throttle and push_jobs already clean themselves.

create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.marsa_housekeeping()
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.notifications
   where (read_at is not null and created_at < now() - interval '30 days')
      or created_at < now() - interval '90 days';
  delete from public.app_activity_daily where day < current_date - 120;
  delete from public.item_views where day < current_date - 400;
end $$;
revoke all on function public.marsa_housekeeping() from public, anon, authenticated;

-- 03:15 UTC (04:15 Algeria), the quietest hour
select cron.unschedule('marsa-housekeeping') where exists (select 1 from cron.job where jobname = 'marsa-housekeeping');
select cron.schedule('marsa-housekeeping', '15 3 * * *', 'select public.marsa_housekeeping()');

-- Index for the nightly notifications delete (app_activity_daily and item_views already lead with "day")
create index if not exists notifications_created_at_idx on public.notifications (created_at);
