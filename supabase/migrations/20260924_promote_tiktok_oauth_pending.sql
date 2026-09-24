-- Short-lived TikTok OAuth state → profile binding (survives mobile cookie loss on redirect).
-- Service role only (no artist-facing policies).

create table if not exists public.promote_tiktok_oauth_pending (
  state text primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  return_to text not null default '/settings',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists promote_tiktok_oauth_pending_expires_idx
  on public.promote_tiktok_oauth_pending (expires_at);

alter table public.promote_tiktok_oauth_pending enable row level security;
