-- FK cleanup for song deletion:
--   posts.song_id      → ON DELETE SET NULL  (keep the lyric; clear the link)
--   queue_items.song_id → ON DELETE CASCADE  (queue row is meaningless without the song)

-- posts.song_id must be nullable for SET NULL
alter table public.posts
  alter column song_id drop not null;

do $$
declare
  r record;
begin
  for r in
    select tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
    where tc.table_schema = 'public'
      and tc.table_name = 'posts'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'song_id'
  loop
    execute format('alter table public.posts drop constraint %I', r.constraint_name);
  end loop;
end $$;

alter table public.posts
  add constraint posts_song_id_fkey
  foreign key (song_id) references public.songs(id)
  on delete set null;

-- queue_items may not exist on every environment
do $$
declare
  r record;
begin
  if to_regclass('public.queue_items') is null then
    raise notice 'queue_items does not exist — skipping song_id FK change';
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
      and kcu.column_name = 'song_id'
  loop
    execute format('alter table public.queue_items drop constraint %I', r.constraint_name);
  end loop;

  alter table public.queue_items
    add constraint queue_items_song_id_fkey
    foreign key (song_id) references public.songs(id)
    on delete cascade;
end $$;
