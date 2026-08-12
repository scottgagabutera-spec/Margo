# Meilisearch — Margo search index

Self-hosted Meilisearch indexes users, posted lyrics, artists, and catalog lines from **Supabase only** (no Firebase).

## Environment variables

Add to `.env.local` (and Vercel):

| Variable | Purpose |
|----------|---------|
| `MEILISEARCH_HOST` | e.g. `https://search.trymargo.com` or `http://127.0.0.1:7700` |
| `MEILISEARCH_ADMIN_KEY` | Master key for backfill + webhook sync |
| `MEILISEARCH_SEARCH_KEY` | Optional search-only key for `/api/search` (falls back to admin key) |
| `MEILISEARCH_WEBHOOK_SECRET` | Shared secret for `x-margo-webhook-secret` header |

## One-shot backfill

```bash
node scripts/meilisearch-backfill.mjs
```

Imports all profiles, active top-level posts, and live catalog lyric lines.

## Realtime sync (Supabase Database Webhooks)

Create webhooks in **Supabase → Database → Webhooks** for tables `profiles`, `posts`, `lyric_lines`:

- Events: INSERT, UPDATE, DELETE
- URL: `https://trymargo.com/api/webhooks/meilisearch-sync`
- HTTP header: `x-margo-webhook-secret: <MEILISEARCH_WEBHOOK_SECRET>`

## Search UI

- Route: `/search`
- API: `GET /api/search?q=...`
- Debounce: **150ms**
- Feed/Discover local filters unchanged (additive global search only)

## Index

- UID: `margo`
- Primary key: `id` (composite: `post:uuid`, `user:uuid`, etc.)
- Types: `user`, `lyric`, `artist`, `catalog_line`
