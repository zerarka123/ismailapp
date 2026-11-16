-- 016: two public numbers for the home page of marsadz.app: how many accounts exist and how many listings are live.
-- Counts only (no names, no ids, no contacts). Safe to run again. Nothing else changes.

create or replace function public.site_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'users',    (select count(*) from public.profiles),
    'listings', (select count(*) from public.listings l
                  where l.status::text = 'published' and (l.expires_at is null or l.expires_at > now()))
  );
$$;

revoke all on function public.site_stats() from public;
grant execute on function public.site_stats() to anon, authenticated;
