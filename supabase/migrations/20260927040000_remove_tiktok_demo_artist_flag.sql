-- TikTok demo review account — remove from public artist roster (not a real roster artist).

update public.profiles
set
  is_artist = false,
  artist_status = 'removed',
  artist_status_reason = 'Demo account — excluded from Discover',
  artist_status_updated_at = now()
where username = 'tiktokdemoreview';
