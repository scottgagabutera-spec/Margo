-- Curated landing "Exchange of the Week" — singleton row.
-- Public can read; writes go through service-role admin API only.

create table if not exists public.site_featured_exchange (
  id smallint primary key default 1 check (id = 1),
  post_text text not null default '',
  post_artist text not null default '',
  post_song text not null default '',
  post_username text not null default '',
  reply_text text not null default '',
  reply_artist text not null default '',
  reply_song text not null default '',
  reply_username text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.site_featured_exchange enable row level security;

drop policy if exists "public reads featured exchange" on public.site_featured_exchange;
create policy "public reads featured exchange" on public.site_featured_exchange
  for select using (true);

-- No insert/update/delete policies for authenticated clients — admin API uses service role.
