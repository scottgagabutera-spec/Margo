-- PR2: card_exports analytics rows from CardExportModal downloads.
-- Apply in Supabase SQL Editor; repo tracks migrations.
-- No admin policies / Growth UI yet — client insert + own-select only.

create table if not exists public.card_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid null references public.posts(id) on delete set null,
  theme text not null,
  shape text not null,
  created_at timestamptz not null default now()
);

create index if not exists card_exports_user_created_idx
  on public.card_exports (user_id, created_at desc);

create index if not exists card_exports_created_idx
  on public.card_exports (created_at desc);

alter table public.card_exports enable row level security;

-- Signed-in users can record their own export events.
drop policy if exists "users insert own card exports" on public.card_exports;
create policy "users insert own card exports" on public.card_exports
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can read their own export history (optional transparency; mirrors post_reports).
drop policy if exists "users read own card exports" on public.card_exports;
create policy "users read own card exports" on public.card_exports
  for select
  to authenticated
  using (auth.uid() = user_id);
