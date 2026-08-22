-- Artist self-declared AI-generated song disclosure (song-level metadata).
ALTER TABLE public.songs
  ADD COLUMN is_ai_generated boolean NOT NULL DEFAULT false;
