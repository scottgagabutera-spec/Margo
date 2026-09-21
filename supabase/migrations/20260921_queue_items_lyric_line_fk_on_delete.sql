-- Saved lyric playlists (queue_items) point at lyric_lines.id.
-- Studio regenerate/resume deletes those rows to rewrite Whisper output.
-- ON DELETE NO ACTION blocked the wipe. SET NULL keeps the playlist row
-- (song_id still plays); tag-vibes rematches by line_index when a
-- replacement line exists.

do $$
declare
  r record;
begin
  if to_regclass('public.queue_items') is null then
    raise notice 'queue_items does not exist — skipping lyric_line_id FK change';
    return;
  end if;

  for r in
    select tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
    where tc.table_schema = 'public'
      and tc.table_name = 'queue_items'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'lyric_line_id'
  loop
    execute format('alter table public.queue_items drop constraint %I', r.constraint_name);
  end loop;

  alter table public.queue_items
    add constraint queue_items_lyric_line_id_fkey
    foreign key (lyric_line_id) references public.lyric_lines(id)
    on delete set null;
end $$;
