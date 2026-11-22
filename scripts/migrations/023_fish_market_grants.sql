-- 023: the fish market tables (migration 011) were created without any GRANT for the
-- `authenticated` role (this project's default privileges no longer grant new tables to it),
-- so every request from the app failed with "permission denied" -> "Échec du chargement".
-- Grant only what the app uses; RLS policies (already in place) still decide which rows.

grant select, delete on public.fish_requests to authenticated;
grant insert (user_id, category, item, quantity, wilaya_id, commune, urgency) on public.fish_requests to authenticated;
grant update (status) on public.fish_requests to authenticated;            -- expires_at stays server-side

grant select on public.fish_request_contacts to authenticated;
grant insert (request_id, phone, whatsapp) on public.fish_request_contacts to authenticated;

grant select, delete on public.fish_offers to authenticated;
grant insert (request_id, seller_id, available, price_dzd, quantity, phone, whatsapp) on public.fish_offers to authenticated;

grant select, delete on public.fish_follows to authenticated;
grant insert (user_id, seller_id, species) on public.fish_follows to authenticated;

grant select on public.fish_reports to authenticated;                      -- rows: admin only (RLS)
grant insert (reporter_id, target_type, target_id, reason) on public.fish_reports to authenticated;
grant update (status) on public.fish_reports to authenticated;             -- admin only (RLS)
