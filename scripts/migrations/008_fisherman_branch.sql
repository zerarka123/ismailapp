-- 008: "Fisherman" guide branch (fish-for-sale ads with a short video, notifications)

-- 1) the branch
do $$
begin
  if not exists (select 1 from public.guide_categories where slug = 'fishermen') then
    insert into public.guide_categories (section, slug, name_ar, name_fr, name_en, sort_order)
    values ('fisher', 'fishermen', 'الصياد', 'Pêcheur', 'Fisherman',
            (select coalesce(min(sort_order), 1) - 1 from public.guide_categories where section = 'fisher'));
  end if;
end $$;

-- 2) short video attached to an ad (stored in the portfolio-videos bucket)
alter table public.listings add column if not exists video_path text;
alter table public.listings drop constraint if exists listings_video_path_len_check;
alter table public.listings add constraint listings_video_path_len_check check (video_path is null or char_length(video_path) <= 300);
grant select (video_path) on public.listings to anon, authenticated;
grant insert (video_path) on public.listings to authenticated;
grant update (video_path) on public.listings to authenticated;

-- 3) only an active fisherman account may publish a fish ad (kind equipment + product_type fish)
create or replace function public.marsa_guard_fish_listing()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.product_type = 'fish' and new.kind::text = 'equipment' then
    if not exists (
      select 1 from public.professional_profiles pp
       where pp.owner_id = new.seller_id
         and pp.pro_type::text = 'fisherman'
         and pp.status::text = 'active'
         and (pp.subscription_ends_at is null or pp.subscription_ends_at > now())
    ) then
      raise exception 'fisherman_only';
    end if;
  elsif new.video_path is not null then
    -- videos in ads are only for fish ads
    new.video_path := null;
  end if;
  return new;
end $$;
drop trigger if exists marsa_guard_fish_listing on public.listings;
create trigger marsa_guard_fish_listing before insert on public.listings
  for each row execute function public.marsa_guard_fish_listing();

-- 4) notifications: a new fish ad goes to the followers of the Fisherman branch and to users of the same wilaya.
--    Everything else behaves exactly as before.
create or replace function public.marsa_notify_new_listing()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  l record;
  v_cat bigint;
  v_slug text;
  v_cat_ar text;
  v_biz text;
  v_path text;
begin
  select id, kind::text as kind, title, seller_id, wilaya_id, status::text as status, product_type
    into l from public.listings where id = new.listing_id;
  if not found or l.status <> 'published' then return new; end if;
  v_path := '/listing/' || l.id::text;

  if l.kind = 'equipment' and l.product_type = 'fish' then
    select pp.category_id, gc.slug, gc.name_ar, pp.business_name into v_cat, v_slug, v_cat_ar, v_biz
      from public.professional_profiles pp
      left join public.guide_categories gc on gc.id = pp.category_id
     where pp.owner_id = l.seller_id and pp.pro_type::text = 'fisherman'
     order by (pp.status::text = 'active') desc
     limit 1;
    insert into public.notifications (user_id, type, params, path)
    select distinct on (np.user_id) np.user_id, 'new_catch',
           jsonb_build_object('title', l.title, 'business', v_biz, 'branch', v_slug, 'branch_ar', v_cat_ar, 'wilaya_id', l.wilaya_id), v_path
      from public.notification_prefs np
      left join public.profiles pr on pr.id = np.user_id
     where np.enabled and np.user_id <> l.seller_id
       and ((v_cat is not null and v_cat = any(np.category_ids))
            or np.wilaya_id = l.wilaya_id
            or (np.wilaya_id is null and pr.wilaya_id = l.wilaya_id))
     limit 5000;
  elsif l.kind = 'gear' then
    select pp.category_id, gc.slug, gc.name_ar, pp.business_name into v_cat, v_slug, v_cat_ar, v_biz
      from public.professional_profiles pp
      left join public.guide_categories gc on gc.id = pp.category_id
     where pp.owner_id = l.seller_id
     order by (pp.status::text = 'active') desc
     limit 1;
    if v_cat is null then return new; end if;
    insert into public.notifications (user_id, type, params, path)
    select np.user_id, 'new_product',
           jsonb_build_object('title', l.title, 'branch', v_slug, 'branch_ar', v_cat_ar, 'business', v_biz), v_path
      from public.notification_prefs np
     where np.enabled and np.user_id <> l.seller_id and v_cat = any(np.category_ids)
     limit 5000;
  else
    insert into public.notifications (user_id, type, params, path)
    select np.user_id, 'new_listing', jsonb_build_object('title', l.title, 'kind', l.kind, 'wilaya_id', l.wilaya_id), v_path
      from public.notification_prefs np
     where np.enabled and np.user_id <> l.seller_id and l.kind = any(np.kinds)
       and (np.wilaya_id is null or np.wilaya_id = l.wilaya_id)
     limit 5000;
  end if;
  return new;
exception when others then
  raise warning 'marsa_notify_new_listing: %', sqlerrm;
  return new;
end $$;

-- 5) an activated fisherman automatically follows his own branch (already handled by marsa_follow_own_branch)
