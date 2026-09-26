-- Multi-page Facebook OAuth selection (avoids oversized httpOnly cookies).
-- Service role only (no artist-facing policies).

create table if not exists public.promote_facebook_page_pending (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  payload_enc text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists promote_facebook_page_pending_expires_idx
  on public.promote_facebook_page_pending (expires_at);

alter table public.promote_facebook_page_pending enable row level security;
