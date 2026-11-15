-- Marsa — migration 015: notification figures in the admin statistics («من فعّل الإشعارات»)
--
-- Run ONCE in the Supabase SQL Editor, after 014_app_analytics.sql. Safe to re-run.
-- It only ADDS one admin-only function that reads the existing tables (no table is created or changed):
--   push_tokens (Android app, migration 003), web_push_subscriptions (browser, migration 009),
--   notification_prefs (switch «الإشعارات» inside the app, migration 003).
-- A table that does not exist yet is simply counted as 0.

create or replace function public.admin_notification_stats()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  has_native boolean := to_regclass('public.push_tokens') is not null;
  has_web    boolean := to_regclass('public.web_push_subscriptions') is not null;
  has_prefs  boolean := to_regclass('public.notification_prefs') is not null;
  v_push text;
  res json;
begin
  if not public.marsa_is_admin() then raise exception 'not_admin'; end if;

  -- every device that can receive a phone / browser notification: (user_id, src, updated_at)
  v_push := concat_ws(' union all ',
    case when has_native then 'select user_id, ''android''::text as src, updated_at from public.push_tokens' end,
    case when has_web then 'select user_id, ''web''::text as src, updated_at from public.web_push_subscriptions' end,
    'select null::uuid, null::text, null::timestamptz where false');

  execute format($q$
    with push (user_id, src, updated_at) as (%s),
    active as (select distinct a.user_id from public.app_activity_daily a
                where a.user_id is not null and a.day > public.marsa_today() - 30)
    select json_build_object(
      'accounts',   (select count(*) from auth.users),
      'android',    (select count(distinct user_id) from push where src = 'android'),
      'web',        (select count(distinct user_id) from push where src = 'web'),
      'any',        (select count(distinct user_id) from push),
      'new_30d',    (select count(distinct user_id) from push where updated_at > now() - interval '30 days'),
      'active_30d', (select count(*) from active),
      'active_with_push', (select count(*) from active a where exists (select 1 from push p where p.user_id = a.user_id)),
      'turned_off', %s,
      'has_native_table', %L::boolean,
      'has_web_table', %L::boolean)
  $q$, v_push,
       case when has_prefs then '(select count(*) from public.notification_prefs np where not np.enabled)' else '0' end,
       has_native, has_web)
  into res;
  return res;
end $$;
revoke all on function public.admin_notification_stats() from public, anon;
grant execute on function public.admin_notification_stats() to authenticated;
