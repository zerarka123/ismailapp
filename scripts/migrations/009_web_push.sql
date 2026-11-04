-- 009: Web Push subscriptions (installed PWA, notifications with the app closed)
create table if not exists public.web_push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  updated_at timestamptz not null default now()
);
create index if not exists web_push_user_idx on public.web_push_subscriptions (user_id);
alter table public.web_push_subscriptions enable row level security;
revoke all on public.web_push_subscriptions from anon, authenticated;

create or replace function public.register_web_push(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_endpoint is null or length(p_endpoint) not between 20 and 2000 or p_endpoint !~ '^https://' then raise exception 'bad_endpoint'; end if;
  if p_p256dh is null or p_auth is null or length(p_p256dh) > 200 or length(p_auth) > 100 then raise exception 'bad_keys'; end if;
  insert into public.web_push_subscriptions (endpoint, user_id, p256dh, auth, updated_at)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, now())
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, updated_at = now();
end $$;
revoke all on function public.register_web_push(text, text, text) from public, anon;
grant execute on function public.register_web_push(text, text, text) to authenticated;

create or replace function public.unregister_web_push(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.web_push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;
revoke all on function public.unregister_web_push(text) from public, anon;
grant execute on function public.unregister_web_push(text) to authenticated;
