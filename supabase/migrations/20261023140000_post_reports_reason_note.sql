-- Add optional free-text note when reason is Other (Report flow v2).
-- No RLS or grant changes.

alter table public.post_reports
  add column if not exists reason_note text;

alter table public.post_reports
  add constraint post_reports_reason_note_length_check
  check (reason_note is null or char_length(reason_note) <= 300);

comment on column public.post_reports.reason_note is
  'Optional detail when reason is Other; max length enforced in app and DB.';
