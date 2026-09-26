# Smart interactions & “ocean” feed — product + engineering roadmap

**Status:** Living doc (2026-09-26). Signature lyric is the first **context long-press** ship target on draft PR #242.

---

## Design partnership

| Who | Role |
|-----|------|
| **You + brand** | `MARGO_BRAND.md` (Sections 14–15), GIANTS WAY bar, final call on gesture feel (hold duration, motion, copy). |
| **Cursor / Cloud Agent** | Prototype in-repo: shared hooks, action sheets, feed behavior, audits; iterate from your screen recordings. |
| **Human product designer (optional)** | Motion systems, swipe vs hold matrices, marketing “ocean” narrative — agent can implement tokens once spec’d. |

We do **not** need a separate design tool connected to Cursor to start: the repo *is* the design system. For “highest point” interactivity, plan short design spikes (1 target at a time: PostCard, then Promote disconnect, etc.) with you testing on device.

---

## Supabase (agent can apply for you)

This environment has **Supabase MCP** on project **Margo** (`axtvisukibxnhnyoffke`).

- New schema: add `supabase/migrations/<timestamp>_name.sql` in git, then agent runs **`apply_migration`** — no copy/paste in the dashboard for routine DDL.
- **`signature_song_id`** is **already applied** on production (`20260921183826_signature_song_id`).
- Paused projects must be **ACTIVE** before MCP applies SQL; say if migrations fail and we’ll restore/wake the project.

Data fixes, RLS reviews, and one-off SQL still go through the same MCP **`execute_sql`** when appropriate.

---

## Interaction language (target standard)

| Gesture | Duration | Use |
|---------|----------|-----|
| **Tap** | Instant | Primary intent: play snippet, open post, toggle resonate, navigate. |
| **Long-press (context)** | ~720ms (`MARGO_CONTEXT_LONG_PRESS_MS`) | Ambiguous or destructive **options** → `MargoActionSheet` (never fire delete on tap). |
| **Long-press (compose)** | 400ms | Line **combine** (existing Compose / Stage picker). |
| **Swipe** | — | **Deferred** for feed cards (Tinder-style dismiss is high risk for lyrics product — needs design pass). Prefer hold → sheet first. |

**Building blocks (repo):**

- `hooks/useLongPress.ts` — pointer capture, move cancel, click swallow.
- `components/margo-long-press-hint.tsx` — gold inset ring while holding.
- `components/margo-action-sheet.tsx` — bottom sheet actions.
- `lib/margo-gestures.ts` — timings + light haptic.

**Discoverability:** subtle “Hold for options” on own signature; selected catalog line on edit profile. Avoid modal tutorials.

---

## Signature lyric (shipped on branch)

- **Own profile:** tap plays catalog snippet when available; **hold** opens Edit / Replace / Remove.
- **Edit profile:** tap line = pick; **hold selected line** = same sheet.
- Search: Margo + Genius + Apple (`lib/song-search/unified-song-search.ts`).

---

## PostCard & feed — next candidates (audit only until you approve)

From `docs/DESTRUCTIVE_TAP_AUDIT.md` plus gesture ideas:

| Target | Tap today | Proposed “smart” pattern | Priority |
|--------|-----------|---------------------------|----------|
| Own post ⋮ Delete | Menu → dialog | Long-press card chrome **or** hold ⋮ → sheet | Medium |
| Resonate | Immediate | Keep tap; optional long-press → “Quote replay / Export / …” | Low |
| Expand lyric row | Opens thread | Keep; long-press lyric → copy / export snippet | Medium |
| Listen Later remove | Immediate | Hold row → Remove / Cancel | Medium |
| Settings Promote disconnect | **Immediate API** | **Hold** → disconnect sheet | **High** |

---

## Feed as “ocean” — no obvious beginning or end

**Problem you described:** The feed feels like it has a **start line** (stories dock, sort pills, “Be the first”, empty states) instead of being **lost in depth**.

**Principles:**

1. **No “you are here at the beginning”** hero — stories/sort stay utility chrome, not a chapter title.
2. **No hard “end”** — replace dead bottom spacer with soft continuous load (infinite scroll / cursor pagination) when backend supports it.
3. **Empty ocean** — when quiet, copy like “The water’s still tonight” + drift to Discover, not “Be the first” (beginner framing).
4. **New moments** — keep pill as **current** (something arrived), not “start reading from here”.

**Engineering phases:**

| Phase | Work |
|-------|------|
| **A — Copy & chrome** | Soften empty feed CTA; optional fade at top instead of strong section breaks. |
| **B — Pagination** | `warmFeedPosts` cursor + “load more when near bottom”; no “You’re all caught up” footer. |
| **C — Ambient motion** | Very subtle parallax / atmosphere (brand-safe); design spike required. |

Phase A–B are logical next PRs after you sign off on long-press signature UX.

---

## How to test signature long-press (before merge)

1. **You tab** → hold signature block ~1s → sheet; quick tap should **play** (if catalog-linked), not remove.
2. **Edit profile → Signature** → select a line → hold → sheet; quick tap does nothing on selected line.

Tune `MARGO_CONTEXT_LONG_PRESS_MS` in `lib/margo-gestures.ts` if 720ms feels too short/long on your phone.
