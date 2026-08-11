-- Cache for Suggested Lyric Back LLM rankings (Approach A).
-- Written/read only by service-role API routes; no client policies.

create table if not exists public.suggest_lyric_back_cache (
  post_id uuid primary key references public.posts (id) on delete cascade,
  suggestions jsonb not null default '[]'::jsonb,
  catalog_fingerprint text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists suggest_lyric_back_cache_expires_at_idx
  on public.suggest_lyric_back_cache (expires_at);

comment on table public.suggest_lyric_back_cache is
  'Per-post Suggested Lyric Back picks from gpt-4o-mini. Fingerprint invalidates when eligible catalog units change.';

alter table public.suggest_lyric_back_cache enable row level security;
-- No policies: anon/authenticated cannot read/write; service role bypasses RLS.
