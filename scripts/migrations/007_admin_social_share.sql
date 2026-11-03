-- 007: admin-only RPCs behind the "share on Marsa pages" button (needs the social_approved / social_posted_at columns
-- and the notify_make_approved_listing trigger created earlier)
create or replace function public.admin_social_listings(p_limit int default 40)
returns table (id uuid, title text, kind text, price_dzd numeric, published_at timestamptz, social_posted_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select l.id, l.title, l.kind::text, l.price_dzd::numeric, l.published_at, l.social_posted_at
    from public.listings l
    where l.status::text = 'published'
    order by l.published_at desc
    limit least(coalesce(p_limit, 40), 100);
end $$;
revoke all on function public.admin_social_listings(int) from public, anon;
grant execute on function public.admin_social_listings(int) to authenticated;

create or replace function public.admin_share_listing(p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.listings set social_approved = true
   where id::text = p_id and status::text = 'published' and social_posted_at is null;
  if not found then raise exception 'not_found_or_already_shared'; end if;
end $$;
revoke all on function public.admin_share_listing(text) from public, anon;
grant execute on function public.admin_share_listing(text) to authenticated;
