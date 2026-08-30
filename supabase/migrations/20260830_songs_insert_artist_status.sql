-- Studio already blocks frozen/removed in the UI. INSERT RLS did not —
-- is_artist stays true after a freeze, so a direct client insert still
-- succeeded. Match the Studio gate: active/warned (and the default) only.

drop policy if exists "artists insert own songs" on public.songs;

create policy "artists insert own songs" on public.songs
  for insert with check (
    owner_profile_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and is_artist = true
        and artist_status in ('active', 'warned')
    )
  );
