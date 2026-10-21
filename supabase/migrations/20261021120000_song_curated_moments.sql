-- Curated lyric moments per catalog song (Compose + Discover). Written by service role only.

create table if not exists public.song_curated_moments (
  song_id uuid primary key references public.songs (id) on delete cascade,
  lyrics_checksum text not null,
  moments jsonb not null default '[]'::jsonb,
  model text not null default 'gpt-4o-mini',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists song_curated_moments_updated_at_idx
  on public.song_curated_moments (updated_at desc);

comment on table public.song_curated_moments is
  'LLM-curated contiguous lyric moments for a song; invalidated when lyrics_checksum changes.';

alter table public.song_curated_moments enable row level security;

create policy "authenticated read song_curated_moments"
  on public.song_curated_moments
  for select
  to authenticated
  using (true);

-- Inserts/updates/deletes: service role only (no policies for authenticated).

create or replace function public.touch_song_curated_moments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists song_curated_moments_updated_at on public.song_curated_moments;
create trigger song_curated_moments_updated_at
  before update on public.song_curated_moments
  for each row
  execute function public.touch_song_curated_moments_updated_at();
