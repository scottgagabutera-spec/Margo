-- Inbox Realtime: Hub / notifications / DMs subscribe to these tables,
-- but they were never added to supabase_realtime (only posts + engagement
-- were, in 20260809). Without this, follow inserts never reach the client
-- until a full remount.

do $$
declare
  t text;
begin
  foreach t in array array['notifications', 'messages']
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
