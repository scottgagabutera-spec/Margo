-- Track unresolved promote R2 staging deletes for cron retry + operator visibility.
-- Service role only (no artist-facing policies).

create table if not exists public.promote_staging_cleanup_failures (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references public.promote_queue (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  object_key text not null,
  reason text not null
    check (reason in ('r2_delete_error', 'targets_load_error', 'targets_not_final')),
  attempts integer not null default 1 check (attempts >= 1),
  last_error text,
  created_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists promote_staging_cleanup_failures_unresolved_idx
  on public.promote_staging_cleanup_failures (resolved_at, last_attempt_at)
  where resolved_at is null;

create unique index if not exists promote_staging_cleanup_failures_open_queue_key_idx
  on public.promote_staging_cleanup_failures (queue_id, object_key)
  where resolved_at is null and queue_id is not null;

alter table public.promote_staging_cleanup_failures enable row level security;
