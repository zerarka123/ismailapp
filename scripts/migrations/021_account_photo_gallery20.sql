-- 021: one account photo + gallery of 20. Run ONCE in Supabase SQL Editor. Safe to run again.
--
-- 1) Existing accounts that registered with several photos: the FIRST one stays the account photo
--    (professional_images), the others move to the gallery (portfolio_photos), up to 20 gallery photos.
--    Same files in the same bucket (pro-images): nothing is uploaded, deleted or broken. Followers get NO
--    "new work" notification for these moved photos. A photo that does not fit in a full gallery stays where it was.
-- 2) Gallery limit: 20 photos per account (was 30; the largest gallery today has 20).
-- 3) From now on an account has one photo: if an app still sends more (an old version kept in a phone),
--    the extra photos go to the gallery instead of being refused, so registration never fails because of it.

-- 1) move the extra registration photos
alter table public.portfolio_photos disable trigger marsa_notify_new_work;

with ranked as (
  select pi.id, pi.professional_id, pi.storage_path, pi.created_at, pp.owner_id,
         row_number() over (partition by pi.professional_id order by pi.sort_order, pi.created_at, pi.id) as rn
    from public.professional_images pi
    join public.professional_profiles pp on pp.id = pi.professional_id
),
room as (
  select r.*,
         20 - (select count(*) from public.portfolio_photos pf where pf.professional_id = r.professional_id) as free,
         row_number() over (partition by r.professional_id order by r.rn) as k
    from ranked r
   where r.rn > 1
     and not exists (select 1 from public.portfolio_photos pf
                      where pf.professional_id = r.professional_id and pf.storage_path = r.storage_path)
),
moving as (
  select * from room where k <= free
),
ins as (
  insert into public.portfolio_photos (owner_id, professional_id, storage_path, created_at)
  select owner_id, professional_id, storage_path, created_at from moving
  returning 1
)
delete from public.professional_images
 where id in (select id from moving);

alter table public.portfolio_photos enable trigger marsa_notify_new_work;

-- 2) gallery: 20 photos per account
create or replace function public.marsa_photo_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.portfolio_photos where professional_id = new.professional_id) >= 20 then
    raise exception 'photo_limit_reached';
  end if;
  return new;
end $$;

-- 3) one account photo: extra photos go to the gallery (fires before trg_pro_images_limit, which stays as it is)
create or replace function public.marsa_one_account_photo()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if not exists (select 1 from public.professional_images where professional_id = new.professional_id) then
    return new; -- the first photo is the account photo
  end if;
  select owner_id into v_owner from public.professional_profiles where id = new.professional_id;
  if v_owner is not null
     and (select count(*) from public.portfolio_photos where professional_id = new.professional_id) < 20 then
    insert into public.portfolio_photos (owner_id, professional_id, storage_path) values (v_owner, new.professional_id, new.storage_path);
  end if;
  return null; -- not added as a second account photo
end $$;
drop trigger if exists marsa_one_account_photo on public.professional_images;
create trigger marsa_one_account_photo before insert on public.professional_images
  for each row execute function public.marsa_one_account_photo();
