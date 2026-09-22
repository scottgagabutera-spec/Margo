-- Promote publish adapters (direct vs Buffer) + per-artist Buffer OAuth account.

create table if not exists public.artist_buffer_connections (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'connected'
    check (status in ('connected', 'expired', 'revoked', 'error')),
  access_token_enc text not null,
  refresh_token_enc text,
  token_expires_at timestamptz,
  organization_id text,
  channels jsonb not null default '[]'::jsonb,
  channels_synced_at timestamptz,
  connected_at timestamptz not null default now(),
  last_error text
);

create index if not exists artist_buffer_connections_status_idx
  on public.artist_buffer_connections (status);

alter table public.artist_social_connections
  add column if not exists publish_adapter text not null default 'direct'
  check (publish_adapter in ('direct', 'buffer'));

alter table public.promote_queue_targets
  add column if not exists publish_adapter text not null default 'direct'
  check (publish_adapter in ('direct', 'buffer'));

alter table public.artist_buffer_connections enable row level security;

drop policy if exists artist_buffer_connections_owner on public.artist_buffer_connections;
create policy artist_buffer_connections_owner on public.artist_buffer_connections
  for all
  using (public.is_active_promote_artist(auth.uid()) and profile_id = auth.uid())
  with check (public.is_active_promote_artist(auth.uid()) and profile_id = auth.uid());
