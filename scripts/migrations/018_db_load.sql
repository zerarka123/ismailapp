-- 018: lighter database work. Run ONCE in Supabase SQL Editor (any time, before or after the new front end).
-- Adds indexes and rewrites three read policies so the same check is not repeated for every row.
-- Does not change any data and does not change who can see what. Safe to run again.

-- 1) The market feed (home, search, sponsored strip) always reads published ads newest first.
create index if not exists listings_feed_idx on public.listings (bumped_at desc)
  where status = 'published';
create index if not exists listings_seller_idx on public.listings (seller_id, published_at desc);
-- the cover photo of each card and the photos of a listing page
create index if not exists listing_images_listing_idx on public.listing_images (listing_id, sort_order);
-- the requester's contact is read per request, the offers per request and seller
create index if not exists fish_offers_seller_idx on public.fish_offers (request_id, seller_id);

-- 2) "I need" requests: is_fish_seller() used to run once PER ROW. Wrapped in (select ...), Postgres runs it
--    once per query. Same rule as before.
drop policy if exists fish_requests_read on public.fish_requests;
create policy fish_requests_read on public.fish_requests for select to authenticated
  using (user_id = (select auth.uid()) or (expires_at > now() and (select public.is_fish_seller((select auth.uid())))));

drop policy if exists fish_offers_read on public.fish_offers;
create policy fish_offers_read on public.fish_offers for select to authenticated
  using (seller_id = (select auth.uid())
         or exists (select 1 from public.fish_requests r where r.id = request_id and r.user_id = (select auth.uid())));

drop policy if exists fish_contacts_read on public.fish_request_contacts;
create policy fish_contacts_read on public.fish_request_contacts for select to authenticated
  using (
    exists (select 1 from public.fish_requests r where r.id = request_id and r.user_id = (select auth.uid()))
    or exists (select 1 from public.fish_offers o where o.request_id = fish_request_contacts.request_id and o.seller_id = (select auth.uid()) and o.available)
  );

-- 3) Photos are now saved as WebP when the phone can (smaller files). Buckets that limit file types accept it too.
--    (The app also falls back to JPEG by itself if a bucket refuses WebP.)
update storage.buckets
   set allowed_mime_types = array_append(allowed_mime_types, 'image/webp')
 where id in ('listing-images', 'pro-images', 'announcements')
   and allowed_mime_types is not null
   and not ('image/webp' = any (allowed_mime_types));

analyze public.listings;
analyze public.listing_images;
