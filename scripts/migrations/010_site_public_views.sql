-- 010: public read-only views for the marketing site (marsadz.app). No phone, e-mail, owner id or contacts are exposed.

create or replace view public.site_categories as
select gc.id, gc.section, gc.slug, gc.name_ar, gc.name_fr, gc.name_en, gc.sort_order,
       (select count(*) from public.professional_profiles pp
         where pp.status::text = 'active'
           and (pp.subscription_ends_at is null or pp.subscription_ends_at > now())
           and pp.category_id in (select c2.id from public.guide_categories c2
                                   where c2.slug = gc.slug or (gc.slug = 'naval_mechanics' and c2.slug = 'naval_electrics'))
       )::int as active_count
from public.guide_categories gc
where gc.slug not in ('wood_workshops', 'parts_suppliers', 'naval_electrics', 'fishing_trips', 'jobs');

create or replace view public.site_pros as
select pp.id,
       pp.business_name,
       pp.description,
       pp.address,
       pp.pro_type::text as pro_type,
       pp.badge_verified,
       pp.created_at,
       w.name_ar as wilaya_ar,
       case when gc.slug = 'naval_electrics' then 'naval_mechanics' else gc.slug end as category_slug,
       case when gc.slug = 'naval_electrics' then 'ميكانيك وكهرباء السفن' else gc.name_ar end as category_ar,
       (select pi.storage_path from public.professional_images pi where pi.professional_id = pp.id order by pi.sort_order limit 1) as cover_path,
       (select coalesce(array_agg(x.storage_path), '{}') from (
          select pi.storage_path from public.professional_images pi where pi.professional_id = pp.id order by pi.sort_order limit 6) x) as images
from public.professional_profiles pp
join public.guide_categories gc on gc.id = pp.category_id
left join public.wilayas w on w.id = pp.wilaya_id
where pp.status::text = 'active'
  and (pp.subscription_ends_at is null or pp.subscription_ends_at > now())
  and gc.slug not in ('wood_workshops', 'parts_suppliers', 'fishing_trips', 'jobs');

-- sponsored ads only (the ones you promote from the admin panel), without description or contacts
create or replace view public.site_sponsored as
select l.id, l.title, l.price_dzd, l.kind::text as kind, l.published_at,
       w.name_ar as wilaya_ar,
       (select li.storage_path from public.listing_images li where li.listing_id = l.id order by li.sort_order limit 1) as cover_path
from public.listings l
left join public.wilayas w on w.id = l.wilaya_id
where l.status::text = 'published'
  and l.expires_at > now()
  and l.sponsored_until is not null and l.sponsored_until > now();

revoke all on public.site_categories, public.site_pros, public.site_sponsored from public, anon, authenticated;
grant select on public.site_categories, public.site_pros, public.site_sponsored to anon, authenticated;
