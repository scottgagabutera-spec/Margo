-- Daily OpenAI spend tracker for on-demand Lyric Back ranking (until PR 5a precompute).
-- Service role only; no client policies.

create table if not exists public.suggest_lyric_back_daily_spend (
  spend_date date primary key,
  spend_usd numeric not null default 0 check (spend_usd >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.suggest_lyric_back_daily_spend is
  'Rolling daily USD estimate for suggest-lyric-back LLM ranks.';

alter table public.suggest_lyric_back_daily_spend enable row level security;
