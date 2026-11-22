-- 022: security hardening (security audit, Nov 2026)
--
-- 1) profiles: any signed-in user could read EVERY profile row (phone, documents_url, ...)
--    through the policy "profiles_select_public". The only screen that needs another
--    user's profile is UserProfile.jsx, and it only shows name / type / verified badge.
--    -> drop the policy, and expose just the safe columns through public_profile(uuid).
-- 2) Revoke EXECUTE from anon/authenticated on functions that must not be called
--    directly through /rest/v1/rpc: every trigger function and internal helpers.
--    (Triggers keep firing: EXECUTE is only checked when a trigger is created.)
-- 3) Pin search_path on the functions the linter reported as "role mutable".

begin;

-- 1) profiles -------------------------------------------------------------
drop policy if exists profiles_select_public on public.profiles;

create or replace function public.public_profile(p_id uuid)
returns table (id uuid, full_name text, user_type text, is_verified boolean, avatar_path text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.full_name::text, p.user_type::text, coalesce(p.is_verified, false), p.avatar_path::text
  from public.profiles p
  where p.id = p_id;
$$;
revoke all on function public.public_profile(uuid) from public;
grant execute on function public.public_profile(uuid) to anon, authenticated;

-- 2) EXECUTE grants --------------------------------------------------------
do $$
declare r record;
begin
  -- every trigger function in public: never callable through the API
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

-- internal helper, only called from the pp_after_change trigger
revoke execute on function public.sync_profile_from_pro(uuid) from public, anon, authenticated;

-- need a signed-in user (they use auth.uid() / are only meaningful for members)
revoke execute on function public.bump_listing(uuid) from public, anon;
grant  execute on function public.bump_listing(uuid) to authenticated;
revoke execute on function public.set_ad_paused(uuid, boolean) from public, anon;
grant  execute on function public.set_ad_paused(uuid, boolean) to authenticated;
revoke execute on function public.admin_set_ad_status(uuid, text, text) from public, anon;
grant  execute on function public.admin_set_ad_status(uuid, text, text) to authenticated;
revoke execute on function public.can_publish_portfolio(uuid) from public, anon;
grant  execute on function public.can_publish_portfolio(uuid) to authenticated;
revoke execute on function public.is_active_pro(uuid) from public, anon;
grant  execute on function public.is_active_pro(uuid) to authenticated;
revoke execute on function public.listing_limits(uuid) from public, anon;
grant  execute on function public.listing_limits(uuid) to authenticated;
-- kept for anon on purpose: is_admin / marsa_is_admin / marsa_my_audience (used inside
-- RLS policies that anon evaluates), get_ads, site_stats, track_*, report_ad.

-- 3) search_path ---------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('is_professional_type','sync_verification','all_images','listing_hash',
                        'portfolio_before_update','map_pro_type','marsa_fish_expiry','marsa_norm_branch')
      and p.proconfig is null
  loop
    execute format('alter function %s set search_path = public', r.sig);
  end loop;
end $$;

commit;
