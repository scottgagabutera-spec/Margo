# Margo — Identity & Supabase Migration Plan
> **STATUS (Aug 2026): SHIPPED / ARCHIVE.** Identity, profiles, follows, messaging, and posts/songs are on Supabase. Cookie auth phases also shipped. Keep for history; do not treat Phase tables as current work.

*Draft v2 — July 2026 — Living document*

**Purpose:** single reference for the move from Firebase-only identity to Supabase-backed profiles, follows, and messaging — what's already shipped, what's next, in what order, and exactly which files are touched. Companion to MARGO_RIGHTS_AND_DISCOVERY_PLAN.md, MARGO_BRAND.md, and the Growth & Platform Work Plan — this doc is the execution layer for Phase 1–2 of that roadmap's Section 2.

---

## 0. Status at a glance

| Phase | Status |
|---|---|
| 0 — Firebase security/moderation patch | **Done** |
| 1 — Supabase project + `profiles` table | **Done** |
| 2 — Auth linking (anon → real account) on Supabase | **Done** |
| 3 — Firebase↔Supabase username seam in posts | **Done** (Option A — snapshot pattern; see Section 6) |
| 4 — Follows + messages tables | **Shipped** — mutual-accept follow model, DM threads, notifications |
| 4.1 — Profile page rebuild | **Shipped** — Message + Follow buttons, bio/signature-lyric empty states, own-lyrics section |
| 4.2 — Private-account content visibility | **Shipped, client-side only** — see Section 9, open security item |
| 5 — Firebase data migration (posts/songs) | Deferred — not blocking, own timeline per Growth doc Section 3.2 |

Branch: `feat/supabase-identity`, not yet merged to `main` as of this doc's writing.

---

## 1. Phase 0 — Firebase Security & Moderation Patch (Done)

Closed out before starting Supabase work, since it was a real open vulnerability, not a nice-to-have.

**What was wrong:** `database.rules.json` had several nodes (`postStats`, `songStats`, `engagement`, `analytics/{postId}/resonates`, `songResonates`, `songPlays`, `posts/{postId}/echoes/{echoId}/resonates`) with `.write: true` and no auth check — any unauthenticated request to the database URL could set arbitrary values. Separately, `/api/moderate` never wrote `flagCount` anywhere; a dead client-side `update()` call in `compose/page.tsx` was silently rejected by the existing rules and swallowed by a `.catch(() => {})`, meaning auto-moderation flags were never actually applied in production.

**Files changed:**
| File | Change |
|---|---|
| `database.rules.json` (via Firebase Console) | Tightened open-write nodes to `auth != null`; `authorUid` now validated against `auth.uid`; `flagCount` write restricted to admin UID only; `analytics/{postId}/resonates/{userId}` restricted to the matching UID |
| `app/api/moderate/route.ts` | Added `postId` to the request body handling and a server-side write of `flagCount` via `firebase-admin`, which bypasses rules entirely (correct — moderation decisions should never be client-writable) |
| `app/compose/page.tsx` | `handlePost`'s moderation fetch now sends `postId: result.key`; removed the dead client-side `update(posts/${id}, {flagCount: 10})` block entirely |

**Verification still open:** Rules Playground test — simulate a write to `posts/{id}/flagCount` as a non-admin authenticated user, confirm "denied." Not yet run.

**Not done, not blocking:** `database.rules.json` and `firebase.json` are still not checked into git — rules currently live only in the Firebase Console, no version history.

---

## 2. Why Supabase, and what stays on Firebase

(Unchanged from v1 — decision confirmed and now proven out in practice: profiles, follows, messages, notifications all live on Supabase; `posts/`, `songs/`, `songStats/`, and all existing Firebase nodes are untouched. Firebase data migration remains its own later project.)

---

## 3–8. Setup, schema, auth migration, seam decision, sequencing

Unchanged from v1 and now implemented as described — schema (Section 4 of v1) shipped as designed, including the `follows` and `messages` tables. **Follow model resolved:** mutual-accept (Section 4's `status` column, as originally proposed) — a first click inserts `pending`/`accepted` depending on a `set_follow_status` trigger keyed on the target's privacy setting; a second click cancels/unfollows. No accept/decline inbox for incoming requests yet outside notifications.

**Username seam (Section 6 of v1) resolved:** Option A shipped — posts still carry a `username` snapshot at post time, now sourced from the Supabase profile. No live resolution at render time; a username change won't retroactively update old posts, matching pre-migration behavior.

---

## 9. Known Open Issue — Firebase RTDB `posts` read access is not private-account-aware

**Status: accepted risk, scheduled for dedicated future work. Not fixed in the `feat/supabase-identity` merge.**

### What's true today
`database.rules.json` has `"posts": { ".read": true }`. Combined with `usePosts()`'s `orderByChild('timestamp').limitToLast(200)` feed query, this means:

- **Fixed (this branch):** the app's UI — feed, profile pages, anywhere `usePosts()` or the new `useVisibleAuthorIds()` hook is used — correctly hides a private account's posts from non-followers. This closes the practical, everyday leak (browsing the feed, viewing a profile).
- **Not fixed:** anyone querying the Firebase REST endpoint or SDK directly, bypassing the app's client code entirely, can still read every post in the database regardless of the author's `is_private` flag. Firebase config being public (as it always is, client-side) makes this a low-effort bypass for someone who goes looking.

### Why it isn't a quick rule change
Firebase RTDB security rules only *add* permission going down the tree — a `.read` rule at `$postId` can never revoke access already granted by `posts.".read": true` above it. And the feed's range query (`orderByChild`/`limitToLast`) needs read permission at the `posts` node itself to execute at all — per-post rules can't secure a list query like this one no matter how they're written. Privacy state (`is_private`, `follows`) also lives in Supabase, not Firebase, so there's no native way for an RTDB rule to consult it directly.

### Real fix options (for whichever future session picks this up)
1. **Server-side proxy (recommended):** move the feed read behind a Next.js API route using the Firebase Admin SDK (bypasses rules), joined against Supabase's privacy/follow state server-side. Tradeoff: loses the live `onValue` realtime push — needs polling or a new realtime layer.
2. **Restructure + mirror:** split `posts` into a world-readable `publicPosts` plus per-author paths with rules driven by a privacy flag mirrored into Firebase (via Cloud Function or webhook whenever Supabase's `is_private` changes). Bigger data migration, but keeps native realtime.

### Decision
Ship the client-side fix now (low exposure — private accounts are a new, low-adoption feature at this point), track this as a named future task rather than block the current merge on a proxy/restructure project. Revisit alongside the Section 5 Firebase data migration work, since both touch the same `posts` node.

---

## 10. Known design-system deviations (not fixed this pass)

Flagging, not fixing — full brand/standards pass (MARGO_BRAND.md Section 14) is its own future sweep across the whole app, not scoped to this branch.

- Profile page's Message/Follow buttons and several labels in this batch of work use `0.6rem`–`0.9rem` type, below the `1rem` interactive-text minimum in Section 14 Rule 3 of the brand doc. Consistent with the existing pattern already present in most of the app (feed, nav, etc.) — not a regression introduced here, just not yet brought up to the newer standard either.
- Not auditing Unicode/icon usage, hardcoded colors, or the other Section 14 rules as part of this merge — out of scope for this pass.

---

## 11. Open Questions (updated)

- ~~Follow model: mutual-accept vs. open-follow~~ — **Resolved:** mutual-accept, shipped.
- ~~Option A vs. B for username resolution in posts~~ — **Resolved:** Option A, shipped.
- Exact Supabase Auth anonymous-linking API surface — implemented; document actual method names used here once confirmed stable (not yet written up).
- Whether `database.rules.json` + `firebase.json` get checked into git — still not done, still low effort, still a nice-to-have.
- **New:** Firebase RTDB `posts` data-layer privacy fix (Section 9) — scheduled, not yet a ticket/branch.
- **New:** Full MARGO_BRAND.md Section 14 compliance sweep (Section 10) — scheduled, not yet a ticket/branch.

---

*Next step: pre-merge evaluation (see PR checklist / evaluation pass), then merge `feat/supabase-identity` to `main`.*