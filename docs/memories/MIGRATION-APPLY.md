# Memories migration apply (after PR approval)

**Repo file:** `supabase/migrations/20261107104029_memories_core.sql`

**Applied on production:** version `20261107104029`, name `20261108100007_memories_core` (MCP assigns timestamp at apply time).

1. Confirm latest production migration before apply was `20261107100006` (`catalog_artists_favorites`).
2. Apply via Supabase MCP `apply_migration` with the exact SQL from that file.
3. Rename the repo file if production records a different version timestamp (keep basename `memories_core`).
4. Add `memories` to the Meilisearch DB webhook (same secret as other tables).

Do not apply before Scott approves the PR.
