-- Add optional free-text note when reason is Other (Report flow v2).
-- Apply only after approval; no RLS or grant changes.

alter table public.post_reports
  add column if not exists reason_note text;

comment on column public.post_reports.reason_note is
  'Optional detail when reason is Other; max length enforced in app.';
