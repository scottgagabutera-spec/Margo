# Listening period column drift check

## Proposed change

Migration `supabase/migrations/20261108100000_memory_listening_period.sql` adds nullable `memories.listening_period` with values `week`, `month`, or `year`.

## Current shipping behavior without migration

Listening memories are stored using existing columns only:

| Period | `date_granularity` | `date_start` | `date_end` |
|--------|-------------------|--------------|------------|
| Week   | `period`          | Monday       | Sunday     |
| Month  | `month`           | First of month | null   |
| Year   | `year`            | Jan 1        | null       |

UI labels infer listening style when the memory has songs, no photos, and the date fields match the table above.

## After migration is applied

API may set `listening_period` on insert for explicit reads. Update `MEMORY_ROW_SELECT` and assembler types when approved.

## Action

Do not apply this migration until you reply **approved** on the PR. No production drift until then.
