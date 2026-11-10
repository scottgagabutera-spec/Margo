-- Rollback for 20261110120000_favorites_songs_albums_mentions.sql (run in Supabase SQL editor if needed).

drop trigger if exists profile_favorite_albums_mention_incr on public.profile_favorite_albums;
drop trigger if exists profile_favorite_songs_mention_incr on public.profile_favorite_songs;
drop trigger if exists profile_favorite_artists_mention_incr on public.profile_favorite_artists;

drop function if exists public.bump_catalog_album_mention();
drop function if exists public.bump_catalog_song_mention();
drop function if exists public.bump_catalog_artist_mention();

drop table if exists public.profile_favorite_albums;
drop table if exists public.profile_favorite_songs;
drop table if exists public.catalog_albums;
drop table if exists public.catalog_songs;

alter table public.catalog_artists drop column if exists favorite_mention_count;
