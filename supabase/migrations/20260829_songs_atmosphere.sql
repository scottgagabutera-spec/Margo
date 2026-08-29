-- Song-level Atmosphere (room feeling while the song plays).
-- NULL = Still: existing catalog is unchanged. Artists opt in from Studio.
ALTER TABLE public.songs
  ADD COLUMN atmosphere text
  CHECK (atmosphere IS NULL OR atmosphere IN ('breath', 'drift', 'pulse', 'weight'));
