-- PR1: profiles.last_seen_at + touch_last_seen() for Identity heartbeat.
-- No Growth/DAU UI in this migration — column + RPC only.
-- Client column protection skipped for PR1 (RPC is the intended write path).

-- ── 1. Column ───────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists last_seen_at timestamptz null;

-- Supports future DAU-style queries (e.g. last_seen_at >= day start).
create index if not exists profiles_last_seen_at_idx
  on public.profiles (last_seen_at);

-- ── 2. RPC: throttled touch for auth.uid() only ─────────────────────────────
create or replace function public.touch_last_seen()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated'
      using errcode = '42501';
  end if;

  update public.profiles
  set last_seen_at = now()
  where id = uid
    and (
      last_seen_at is null
      or last_seen_at < now() - interval '15 minutes'
    );
end;
$$;

revoke all on function public.touch_last_seen() from public;
grant execute on function public.touch_last_seen() to authenticated;

-- Sanity (run in SQL Editor after push):
--   select column_name, data_type
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'profiles' and column_name = 'last_seen_at';
--
--   select public.touch_last_seen();  -- as authenticated session
--   select last_seen_at from public.profiles where id = auth.uid();
