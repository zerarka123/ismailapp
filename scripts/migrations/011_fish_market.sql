-- 011: Fish Market (arrivals today + requests). Fish ads stay in public.listings (one shared source).

-- 1) species + 24h expiry on fish ads
alter table public.listings add column if not exists fish_species text;
alter table public.listings add column if not exists fish_expires_at timestamptz;
alter table public.listings drop constraint if exists listings_fish_species_len_check;
alter table public.listings add constraint listings_fish_species_len_check check (fish_species is null or char_length(fish_species) <= 40);
grant select (fish_species, fish_expires_at) on public.listings to anon, authenticated;
grant insert (fish_species) on public.listings to authenticated;
grant update (fish_species) on public.listings to authenticated;

update public.listings set fish_expires_at = created_at + interval '24 hours'
 where product_type = 'fish' and fish_expires_at is null;

create or replace function public.marsa_fish_expiry()
returns trigger language plpgsql as $$
begin
  if new.product_type = 'fish' then
    if tg_op = 'INSERT' then
      new.fish_expires_at := now() + interval '24 hours';
    else
      new.fish_expires_at := old.fish_expires_at;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists marsa_fish_expiry on public.listings;
create trigger marsa_fish_expiry before insert or update on public.listings
  for each row execute function public.marsa_fish_expiry();

create index if not exists listings_fish_idx on public.listings (fish_expires_at desc)
  where product_type = 'fish';

-- 2) who is an active fish seller (fisherman or fishmonger / cold room)
create or replace function public.is_fish_seller(p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.professional_profiles pp
    left join public.guide_categories gc on gc.id = pp.category_id
    where pp.owner_id = p_uid
      and pp.status::text = 'active'
      and (pp.subscription_ends_at is null or pp.subscription_ends_at > now())
      and (pp.pro_type::text = 'fisherman' or gc.slug = 'cold_rooms')
  );
$$;
revoke all on function public.is_fish_seller(uuid) from public, anon;
grant execute on function public.is_fish_seller(uuid) to authenticated;

-- 3) follows (a seller or a fish type)
create table if not exists public.fish_follows (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid references auth.users(id) on delete cascade,
  species text,
  created_at timestamptz not null default now(),
  check ((seller_id is not null) <> (species is not null)),
  check (species is null or char_length(species) <= 40)
);
create unique index if not exists fish_follows_seller_uq on public.fish_follows (user_id, seller_id) where seller_id is not null;
create unique index if not exists fish_follows_species_uq on public.fish_follows (user_id, species) where species is not null;
create index if not exists fish_follows_lookup_idx on public.fish_follows (seller_id);
alter table public.fish_follows enable row level security;
drop policy if exists fish_follows_own on public.fish_follows;
create policy fish_follows_own on public.fish_follows for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4) requests ("أحتاج")
create table if not exists public.fish_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'fish' check (category in ('fish', 'seafood', 'other')),
  item text not null check (char_length(item) between 2 and 80),
  quantity text check (quantity is null or char_length(quantity) <= 40),
  wilaya_id int not null,
  commune text check (commune is null or char_length(commune) <= 60),
  urgency text not null default 'today' check (urgency in ('urgent', 'today', 'week')),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '48 hours'
);
create index if not exists fish_requests_user_idx on public.fish_requests (user_id, created_at desc);
create index if not exists fish_requests_open_idx on public.fish_requests (wilaya_id, expires_at desc);
alter table public.fish_requests enable row level security;

-- phone of the requester: separate table, visible to him and to sellers who answered "available"
create table if not exists public.fish_request_contacts (
  request_id uuid primary key references public.fish_requests(id) on delete cascade,
  phone text not null check (char_length(phone) <= 20),
  whatsapp text check (whatsapp is null or char_length(whatsapp) <= 20)
);
alter table public.fish_request_contacts enable row level security;

-- seller answers
create table if not exists public.fish_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.fish_requests(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  available boolean not null,
  price_dzd numeric check (price_dzd is null or (price_dzd >= 0 and price_dzd < 10000000)),
  quantity text check (quantity is null or char_length(quantity) <= 40),
  phone text check (phone is null or char_length(phone) <= 20),
  whatsapp text check (whatsapp is null or char_length(whatsapp) <= 20),
  created_at timestamptz not null default now(),
  unique (request_id, seller_id)
);
create index if not exists fish_offers_request_idx on public.fish_offers (request_id);
alter table public.fish_offers enable row level security;

-- daily limit per user (keep in sync with FISH_REQUESTS_PER_DAY in src/config.js)
create or replace function public.marsa_fish_request_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.fish_requests
       where user_id = new.user_id and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'fish_request_limit';
  end if;
  new.expires_at := now() + interval '48 hours';
  return new;
end $$;
drop trigger if exists marsa_fish_request_limit on public.fish_requests;
create trigger marsa_fish_request_limit before insert on public.fish_requests
  for each row execute function public.marsa_fish_request_limit();

-- only an active seller may answer, and only an open request
create or replace function public.marsa_fish_offer_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_fish_seller(new.seller_id) then raise exception 'seller_only'; end if;
  if not exists (select 1 from public.fish_requests r
                  where r.id = new.request_id and r.status = 'open' and r.expires_at > now()
                    and r.user_id <> new.seller_id) then
    raise exception 'request_closed';
  end if;
  if not new.available then new.price_dzd := null; new.quantity := null; new.phone := null; new.whatsapp := null; end if;
  return new;
end $$;
drop trigger if exists marsa_fish_offer_guard on public.fish_offers;
create trigger marsa_fish_offer_guard before insert on public.fish_offers
  for each row execute function public.marsa_fish_offer_guard();

-- RLS
drop policy if exists fish_requests_read on public.fish_requests;
create policy fish_requests_read on public.fish_requests for select to authenticated
  using (user_id = auth.uid() or (expires_at > now() and public.is_fish_seller(auth.uid())));
drop policy if exists fish_requests_insert on public.fish_requests;
create policy fish_requests_insert on public.fish_requests for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists fish_requests_update on public.fish_requests;
create policy fish_requests_update on public.fish_requests for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists fish_requests_delete on public.fish_requests;
create policy fish_requests_delete on public.fish_requests for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists fish_contacts_read on public.fish_request_contacts;
create policy fish_contacts_read on public.fish_request_contacts for select to authenticated
  using (
    exists (select 1 from public.fish_requests r where r.id = request_id and r.user_id = auth.uid())
    or exists (select 1 from public.fish_offers o where o.request_id = fish_request_contacts.request_id and o.seller_id = auth.uid() and o.available)
  );
drop policy if exists fish_contacts_insert on public.fish_request_contacts;
create policy fish_contacts_insert on public.fish_request_contacts for insert to authenticated
  with check (exists (select 1 from public.fish_requests r where r.id = request_id and r.user_id = auth.uid()));

drop policy if exists fish_offers_read on public.fish_offers;
create policy fish_offers_read on public.fish_offers for select to authenticated
  using (seller_id = auth.uid()
         or exists (select 1 from public.fish_requests r where r.id = request_id and r.user_id = auth.uid()));
drop policy if exists fish_offers_insert on public.fish_offers;
create policy fish_offers_insert on public.fish_offers for insert to authenticated
  with check (seller_id = auth.uid());
drop policy if exists fish_offers_delete on public.fish_offers;
create policy fish_offers_delete on public.fish_offers for delete to authenticated
  using (seller_id = auth.uid());

-- 5) reports (requests and offers; listings keep using the existing reports table)
create table if not exists public.fish_reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'request', 'offer')),
  target_id text not null check (char_length(target_id) <= 60),
  reason text check (reason is null or char_length(reason) <= 300),
  status text not null default 'open',
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
alter table public.fish_reports enable row level security;
drop policy if exists fish_reports_insert on public.fish_reports;
create policy fish_reports_insert on public.fish_reports for insert to authenticated
  with check (reporter_id = auth.uid());
drop policy if exists fish_reports_admin on public.fish_reports;
create policy fish_reports_admin on public.fish_reports for all to authenticated
  using (public.marsa_is_admin()) with check (public.marsa_is_admin());

-- 6) notifications
-- 6a) followers of a seller / a fish type get a push when a fish ad is published
create or replace function public.marsa_notify_fish_follows()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  l record;
  v_biz text;
  v_path text;
begin
  select id, title, seller_id, wilaya_id, status::text as status, product_type, fish_species
    into l from public.listings where id = new.listing_id;
  if not found or l.status <> 'published' or l.product_type is distinct from 'fish' then return new; end if;
  v_path := '/listing/' || l.id::text;
  select pp.business_name into v_biz from public.professional_profiles pp
   where pp.owner_id = l.seller_id order by (pp.status::text = 'active') desc limit 1;
  insert into public.notifications (user_id, type, params, path)
  select distinct f.user_id, 'fish_follow',
         jsonb_build_object('title', l.title, 'business', v_biz, 'species', l.fish_species), v_path
    from public.fish_follows f
   where f.user_id <> l.seller_id
     and (f.seller_id = l.seller_id or (f.species is not null and f.species = l.fish_species))
     and not exists (select 1 from public.notifications n where n.user_id = f.user_id and n.path = v_path)
   limit 5000;
  return new;
exception when others then
  raise warning 'marsa_notify_fish_follows: %', sqlerrm;
  return new;
end $$;
drop trigger if exists marsa_notify_zfish_follows on public.listing_contacts;
create trigger marsa_notify_zfish_follows after insert on public.listing_contacts
  for each row execute function public.marsa_notify_fish_follows();

-- 6b) a new request goes only to active sellers of the chosen wilaya
create or replace function public.marsa_notify_fish_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, params, path)
  select distinct pp.owner_id, 'fish_request',
         jsonb_build_object('item', new.item, 'urgency', new.urgency, 'wilaya_id', new.wilaya_id, 'commune', new.commune),
         '/fish/requests/' || new.id::text
    from public.professional_profiles pp
    left join public.guide_categories gc on gc.id = pp.category_id
   where pp.wilaya_id = new.wilaya_id
     and pp.owner_id <> new.user_id
     and pp.status::text = 'active'
     and (pp.subscription_ends_at is null or pp.subscription_ends_at > now())
     and (pp.pro_type::text = 'fisherman' or gc.slug = 'cold_rooms')
   limit 2000;
  return new;
exception when others then
  raise warning 'marsa_notify_fish_request: %', sqlerrm;
  return new;
end $$;
drop trigger if exists marsa_notify_fish_request on public.fish_requests;
create trigger marsa_notify_fish_request after insert on public.fish_requests
  for each row execute function public.marsa_notify_fish_request();

-- 6c) the requester is told when a seller answers "available"
create or replace function public.marsa_notify_fish_offer()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record; v_biz text;
begin
  if not new.available then return new; end if;
  select user_id, item into r from public.fish_requests where id = new.request_id;
  if not found then return new; end if;
  select pp.business_name into v_biz from public.professional_profiles pp
   where pp.owner_id = new.seller_id order by (pp.status::text = 'active') desc limit 1;
  insert into public.notifications (user_id, type, params, path)
  values (r.user_id, 'fish_offer', jsonb_build_object('item', r.item, 'business', v_biz), '/fish/requests/' || new.request_id::text);
  return new;
exception when others then
  raise warning 'marsa_notify_fish_offer: %', sqlerrm;
  return new;
end $$;
drop trigger if exists marsa_notify_fish_offer on public.fish_offers;
create trigger marsa_notify_fish_offer after insert on public.fish_offers
  for each row execute function public.marsa_notify_fish_offer();

-- 7) admin can remove reported requests and answers
drop policy if exists fish_requests_admin_read on public.fish_requests;
create policy fish_requests_admin_read on public.fish_requests for select to authenticated using (public.marsa_is_admin());
drop policy if exists fish_requests_admin_delete on public.fish_requests;
create policy fish_requests_admin_delete on public.fish_requests for delete to authenticated using (public.marsa_is_admin());
drop policy if exists fish_offers_admin_delete on public.fish_offers;
create policy fish_offers_admin_delete on public.fish_offers for delete to authenticated using (public.marsa_is_admin());
