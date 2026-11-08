-- Repo only. Do not apply until product approves schema drift.
-- Optional explicit period kind for listening memories (week, month, year).
-- Until applied, listening memories use date_granularity + date_start/date_end only.

alter table public.memories
  add column if not exists listening_period text;

alter table public.memories
  drop constraint if exists memories_listening_period_check;

alter table public.memories
  add constraint memories_listening_period_check
  check (listening_period is null or listening_period in ('week', 'month', 'year'));

comment on column public.memories.listening_period is 'Listening memory period kind when set.';
