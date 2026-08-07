-- Public avatars bucket + RLS (fixes 403 on profile photos in feed).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "public reads avatars" on storage.objects;
create policy "public reads avatars" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "users upload own avatars" on storage.objects;
create policy "users upload own avatars" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users update own avatars" on storage.objects;
create policy "users update own avatars" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete own avatars" on storage.objects;
create policy "users delete own avatars" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Enable Realtime for feed engagement tables (idempotent).
-- Dashboard equivalent: Database → Publications → supabase_realtime.
do $$
declare
  t text;
begin
  foreach t in array array['posts', 'post_stats', 'post_resonates', 'post_replays']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when undefined_object then
        raise notice 'publication supabase_realtime missing — enable Realtime in the project first';
      when others then
        raise notice 'could not add % to realtime: %', t, sqlerrm;
    end;
  end loop;
end $$;
