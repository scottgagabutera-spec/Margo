-- Per-IP API rate limits (server-only via service_role; no anon/authenticated access).

create table public.api_rate_limits (
  route text not null,
  bucket text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (route, bucket, window_start)
);

comment on table public.api_rate_limits is
  'Hourly counters for public API routes (emotion, genius). Written only from Next.js API routes using service_role.';

alter table public.api_rate_limits enable row level security;

-- No RLS policies: anon/authenticated have no table access. service_role bypasses RLS.

revoke all on table public.api_rate_limits from anon, authenticated, public;
grant select, insert, update, delete on table public.api_rate_limits to service_role;
