-- Echoes: question sets and song answers (extensible payload types).

create table if not exists public.echo_question_sets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.echo_questions (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.echo_question_sets (id) on delete cascade,
  title text not null,
  answer_type text not null check (answer_type in ('song', 'event', 'text', 'quiz')),
  is_active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.echo_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.echo_questions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  time_choice text not null check (time_choice in ('today', 'this_week', 'last_week', 'this_month', 'this_year')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (question_id, profile_id)
);

create index if not exists echo_answers_question_id_idx on public.echo_answers (question_id, created_at desc);
create index if not exists echo_questions_active_idx on public.echo_questions (is_active, starts_at desc);

alter table public.echo_question_sets enable row level security;
alter table public.echo_questions enable row level security;
alter table public.echo_answers enable row level security;

create policy "echo_sets_public_read" on public.echo_question_sets for select using (true);
create policy "echo_questions_public_read" on public.echo_questions for select using (true);
create policy "echo_answers_public_read" on public.echo_answers for select using (true);

create policy "echo_answers_insert_own" on public.echo_answers for insert
  with check (auth.uid() = profile_id);

create policy "echo_answers_update_own" on public.echo_answers for update
  using (auth.uid() = profile_id);

create policy "echo_answers_delete_own" on public.echo_answers for delete
  using (auth.uid() = profile_id);

insert into public.echo_question_sets (slug, title)
values ('listening', 'What are you listening to?')
on conflict (slug) do nothing;

insert into public.echo_questions (set_id, title, answer_type, is_active, starts_at)
select id, 'What are you listening to?', 'song', true, now()
from public.echo_question_sets where slug = 'listening'
and not exists (
  select 1 from public.echo_questions q
  join public.echo_question_sets s on s.id = q.set_id
  where s.slug = 'listening'
);
