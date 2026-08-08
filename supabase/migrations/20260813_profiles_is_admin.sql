-- Admin flag on profiles + helper for RLS + client-side tamper guard.
-- A0 for admin rebuild (C1). Does not change app login yet.
--
-- Finding (mandatory guard): owners already UPDATE their own profiles from the
-- client (useIdentity, settings). RLS is row-level, not column-level, so without
-- a trigger any authenticated user could PATCH is_admin=true.

-- ── 1. Column ───────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- ── 2. Helper for RLS / policies ───────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ── 3. Block client tampering of is_admin ─────────────────────────────────
-- Allows: service_role (PostgREST admin client) and Dashboard SQL (postgres /
-- supabase_admin with no JWT). Rejects: authenticated/anon JWT sessions.
create or replace function public.protect_profiles_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
  privileged boolean;
begin
  privileged :=
    jwt_role = 'service_role'
    or (
      jwt_role = ''
      and session_user in ('postgres', 'supabase_admin')
    );

  if tg_op = 'INSERT' then
    if new.is_admin is true and not privileged then
      raise exception 'permission denied: is_admin is not client-writable'
        using errcode = '42501';
    end if;
    if not privileged then
      new.is_admin := false;
    end if;
    return new;
  end if;

  -- UPDATE
  if new.is_admin is distinct from old.is_admin and not privileged then
    raise exception 'permission denied: is_admin is not client-writable'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profiles_is_admin on public.profiles;
create trigger protect_profiles_is_admin
  before insert or update on public.profiles
  for each row
  execute function public.protect_profiles_is_admin();

-- ── 4. post_reports admin policies (column now exists for sure) ───────────
drop policy if exists "admins read all reports" on public.post_reports;
create policy "admins read all reports" on public.post_reports
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins update reports" on public.post_reports;
create policy "admins update reports" on public.post_reports
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Sanity (run in SQL Editor after push):
--   select column_name, data_type, column_default
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_admin';
--
--   select public.is_admin();  -- as postgres / no JWT: typically false
--
-- Promote admin (after Auth user + profiles row exist) — see PR runbook.
