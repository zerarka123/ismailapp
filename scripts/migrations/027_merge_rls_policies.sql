-- 027: one policy per table/role/action (Supabase advisor "multiple permissive policies"), and admin checks
-- wrapped in (select ...) so Postgres runs them once per query instead of once per row.
-- Access is unchanged: each new policy is the OR of the policies it replaces.

-- listings ---------------------------------------------------------------
drop policy if exists listings_admin_all on public.listings;
drop policy if exists listings_select on public.listings;
create policy listings_select on public.listings for select to public
  using (status in ('published', 'sold') or seller_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists listings_insert_own on public.listings;
create policy listings_insert_own on public.listings for insert to authenticated
  with check (seller_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists listings_update_own on public.listings;
create policy listings_update_own on public.listings for update to authenticated
  using (seller_id = (select auth.uid()) or (select public.is_admin()))
  with check (seller_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists listings_delete_own on public.listings;
create policy listings_delete_own on public.listings for delete to authenticated
  using (seller_id = (select auth.uid()) or (select public.is_admin()));

-- portfolio_videos (everyone can already read) ----------------------------
drop policy if exists portfolio_admin_all on public.portfolio_videos;
drop policy if exists portfolio_insert_own on public.portfolio_videos;
create policy portfolio_insert_own on public.portfolio_videos for insert to authenticated
  with check (owner_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists portfolio_update_own on public.portfolio_videos;
create policy portfolio_update_own on public.portfolio_videos for update to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()))
  with check (owner_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists portfolio_delete_own on public.portfolio_videos;
create policy portfolio_delete_own on public.portfolio_videos for delete to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()));

-- professional_profiles (pros_select already lets admins read) ------------
drop policy if exists pp_admin_badge_select on public.professional_profiles;
drop policy if exists pp_admin_badge_update on public.professional_profiles;
drop policy if exists pros_update on public.professional_profiles;
create policy pros_update on public.professional_profiles for update to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()))
  with check (owner_id = (select auth.uid()) or (select public.is_admin()));

-- profiles (profiles_update and profiles_update_own were identical) -------
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- fish_offers / fish_requests / fish_reports ------------------------------
drop policy if exists fish_offers_admin_delete on public.fish_offers;
drop policy if exists fish_offers_delete on public.fish_offers;
create policy fish_offers_delete on public.fish_offers for delete to authenticated
  using (seller_id = (select auth.uid()) or (select public.marsa_is_admin()));

drop policy if exists fish_requests_admin_delete on public.fish_requests;
drop policy if exists fish_requests_delete on public.fish_requests;
create policy fish_requests_delete on public.fish_requests for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.marsa_is_admin()));
drop policy if exists fish_requests_admin_read on public.fish_requests;
drop policy if exists fish_requests_read on public.fish_requests;
create policy fish_requests_read on public.fish_requests for select to authenticated
  using (user_id = (select auth.uid())
         or (expires_at > now() and (select public.is_fish_seller((select auth.uid()))))
         or (select public.marsa_is_admin()));

drop policy if exists fish_reports_admin on public.fish_reports;
drop policy if exists fish_reports_insert on public.fish_reports;
create policy fish_reports_insert on public.fish_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) or (select public.marsa_is_admin()));
create policy fish_reports_admin_select on public.fish_reports for select to authenticated using ((select public.marsa_is_admin()));
create policy fish_reports_admin_update on public.fish_reports for update to authenticated
  using ((select public.marsa_is_admin())) with check ((select public.marsa_is_admin()));
create policy fish_reports_admin_delete on public.fish_reports for delete to authenticated using ((select public.marsa_is_admin()));

-- sponsors: visitors (anon) and signed-in users get separate read policies --
drop policy if exists sponsors_admin on public.sponsors;
drop policy if exists sponsors_owner_read on public.sponsors;
drop policy if exists sponsors_read on public.sponsors;
create policy sponsors_read_anon on public.sponsors for select to anon
  using (is_active and now() >= starts_at and now() < ends_at);
create policy sponsors_read on public.sponsors for select to authenticated
  using ((is_active and now() >= starts_at and now() < ends_at)
         or id in (select public.marsa_my_sponsor_ids())
         or (select public.is_admin()));
create policy sponsors_admin_insert on public.sponsors for insert to authenticated with check ((select public.is_admin()));
create policy sponsors_admin_update on public.sponsors for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy sponsors_admin_delete on public.sponsors for delete to authenticated using ((select public.is_admin()));

drop policy if exists sponsor_offers_admin on public.sponsor_offers;
drop policy if exists sponsor_offers_owner on public.sponsor_offers;
drop policy if exists sponsor_offers_read on public.sponsor_offers;
create policy sponsor_offers_read_anon on public.sponsor_offers for select to anon
  using (is_active and exists (select 1 from public.sponsors s
         where s.id = sponsor_offers.sponsor_id and s.is_active and now() >= s.starts_at and now() < s.ends_at));
create policy sponsor_offers_read on public.sponsor_offers for select to authenticated
  using ((is_active and exists (select 1 from public.sponsors s
          where s.id = sponsor_offers.sponsor_id and s.is_active and now() >= s.starts_at and now() < s.ends_at))
         or sponsor_id in (select public.marsa_my_sponsor_ids())
         or (select public.is_admin()));
create policy sponsor_offers_insert on public.sponsor_offers for insert to authenticated
  with check (sponsor_id in (select public.marsa_my_sponsor_ids()) or (select public.is_admin()));
create policy sponsor_offers_update on public.sponsor_offers for update to authenticated
  using (sponsor_id in (select public.marsa_my_sponsor_ids()) or (select public.is_admin()))
  with check (sponsor_id in (select public.marsa_my_sponsor_ids()) or (select public.is_admin()));
create policy sponsor_offers_delete on public.sponsor_offers for delete to authenticated
  using (sponsor_id in (select public.marsa_my_sponsor_ids()) or (select public.is_admin()));
