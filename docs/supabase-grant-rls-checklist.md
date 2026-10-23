# Supabase grants and RLS — change checklist

Use this **before** revoking a `GRANT`, tightening RLS, or replacing a `SECURITY DEFINER` function. The #266 incident showed that production can depend on grants and policies that are easy to miss in a single migration file.

## 1. Inventory (required)

For every object you plan to change, list:

| Kind | What to list |
|------|----------------|
| **Tables** | RLS policies (`pg_policies`: name, `cmd`, `roles`, qual/with check) |
| **Functions** | `GRANT EXECUTE` to `anon`, `authenticated`, `service_role`, `PUBLIC` |
| **Triggers** | Triggers on the table that call functions you might alter |
| **App callers** | `rg` in repo for table name, RPC name, and route path |

Example SQL (run in Supabase SQL editor; read-only):

```sql
-- Policies on one table
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'posts';

-- EXECUTE grants on one function
select routine_name, grantee, privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public' and routine_name = 'can_read_sent_moment';
```

## 2. Known sensitive grants (do not revoke without replacement)

| Function / object | Why it matters |
|-------------------|----------------|
| `can_read_sent_moment()` | **Must stay granted to `anon`** for sent-moment RLS (`20261022174500_grant_anon_can_read_sent_moment_rls.sql`). |
| `increment_post_view` | Feed/post cards call via anon/authenticated client. |
| `post_stats` SELECT | Public read policy feeds badges and counts. |
| `delete_own_post` / `update_own_moment` / `delete_or_shell_own_lyric_back` | **service_role only** — app uses session + API routes, not direct client RPC. |

## 3. Repo vs production

Some objects exist in production before they appear in `supabase/migrations/` (legacy apply order). Before changing behavior:

1. Dump the **current** function/trigger definition from production.
2. Add a **no-op documentation migration** to the repo if the object is missing from git.
3. Only then ship a behavior change in a follow-up migration.

## 4. After you change RLS or grants

- [ ] Signed-out smoke: `/`, `/feed`, `/discover` → 200.
- [ ] Unsigned `POST /api/moderate` → 401.
- [ ] Sent-moment read path still works for share links (anon).
- [ ] Resonate / Lyric Back / compose flows on preview with real session.

## Related docs

- `docs/infra/meilisearch.md` — webhook secret (not Postgres RLS).
- `supabase/migrations/20261023120000_api_rate_limits.sql` — `api_rate_limits` has **no** anon policies; limits are enforced in Next.js with `SUPABASE_SERVICE_ROLE_KEY`.
