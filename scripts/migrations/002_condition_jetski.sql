-- Run ONCE in Supabase SQL Editor (after marsa_schema.sql), before using the new app version.
-- Adds: item condition (new/used) and the "jet ski" boat type.
alter table public.listings
  add column if not exists condition text check (condition in ('new', 'used'));

grant insert (condition) on public.listings to authenticated;
grant update (condition) on public.listings to authenticated;

insert into public.boat_types (slug, name_ar, sort_order) values ('jet_ski', 'جت سكي', 7)
on conflict (slug) do nothing;
update public.boat_types set sort_order = 9 where slug = 'other';
