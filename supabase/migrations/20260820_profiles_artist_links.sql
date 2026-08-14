-- Live artist outbound links (social / DSP / Linktree), editable on profile.
-- Separate from artist_applications.links, which stay the verification snapshot.

alter table public.profiles
  add column if not exists artist_links jsonb not null default '{}'::jsonb;
