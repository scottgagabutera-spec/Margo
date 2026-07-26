# Margo — Identity & Supabase Migration Plan
*Draft v1 — July 2026 — Living document*

**Purpose:** single reference for the move from Firebase-only identity to Supabase-backed profiles, follows, and messaging — what's already shipped, what's next, in what order, and exactly which files are touched. Companion to MARGO_RIGHTS_AND_DISCOVERY_PLAN.md, MARGO_BRAND.md, and the Growth & Platform Work Plan — this doc is the execution layer for Phase 1–2 of that roadmap's Section 2.

---

## 0. Status at a glance

| Phase | Status |
|---|---|
| 0 — Firebase security/moderation patch | **Done** |
| 1 — Supabase project + `profiles` table | Not started |
| 2 — Auth linking (anon → real account) on Supabase | Not started |
| 3 — Firebase↔Supabase username seam in posts | Not started |
| 4 — Follows + messages tables | Not started (schema drafted, Section 4) |
| 5 — Firebase data migration (posts/songs) | Deferred — not blocking, own timeline per Growth doc Section 3.2 |

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

**Verification still open:** Rules Playground test — simulate a write to `posts/{id}/flagCount` as a non-admin authenticated user, confirm "denied." Not yet run as of this doc's writing.

**Not done, not blocking:** `database.rules.json` and `firebase.json` are not yet checked into git — rules currently live only in the Firebase Console, no version history. Worth doing eventually (Section 6), not required for Phase 1.

---

## 2. Why Supabase, and what stays on Firebase

Firebase Realtime Database is a fine fit for what it already runs — feed posts, scoped realtime listeners, simple counters. It's a poor fit for the new work: a follow graph with accept/decline state, DMs with read receipts, unique-username enforcement, and row-level authorization — all inherently relational problems that RTDB handles through manual transactions and client-side judgment calls (see `useIdentity.ts`'s `reserveUsername` transaction-and-retry pattern, which Postgres's `unique` constraint replaces outright).

**Decision (confirmed):** build all new relational data — profiles, follows, messages, artist applications, metrics — directly on Supabase/Postgres from day one. Leave `posts/`, `songs/`, `songStats/`, and all existing Firebase nodes exactly as they are for now. Firebase data migration is its own later project (Section 3.2 of the Growth doc), not a dependency of this one.

**What this means for the identity system specifically:** `useIdentity.ts`, `AuthProvider`, `AuthForm`, and `ClaimIdentityBanner` currently all read/write Firebase (`users/{uid}`, `usernames/{name}`). All of that gets rebuilt against Supabase. `useClaimIdentity.ts` and `useUsername.ts` are already-dead code per `useIdentity.ts`'s own docstring (it replaced them) — safe to delete once Supabase identity is live, not before.

---

## 3. Phase 1 — Supabase Setup & `profiles` Table

### 3.1 Setup steps, in order
1. Create the Supabase project (supabase.com dashboard).
2. `npm install @supabase/supabase-js` (not yet in `package.json` — confirmed).
3. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-safe, used in the browser), `SUPABASE_SERVICE_ROLE_KEY` (server-only, never exposed to client — used for admin operations analogous to `firebase-admin`).
4. Create `lib/supabase.ts` — client singleton, mirrors the existing `lib/firebase.ts` pattern.
5. Run the schema migration (Section 4) via the Supabase SQL editor or CLI migrations, whichever matches how `firebase-admin` / Firebase Console changes have been made so far (console-first, per this project's actual workflow — Section 1 note on `database.rules.json`).
6. Confirm anonymous auth is enabled in Supabase Auth settings — required before `AuthProvider` can be ported (Section 5).

### 3.2 New files (Supabase equivalents of existing Firebase files)
| New file | Replaces / parallels |
|---|---|
| `lib/supabase.ts` | `lib/firebase.ts` |
| `hooks/useSupabaseIdentity.ts` (working name) | `hooks/useIdentity.ts` |
| `components/supabase-auth-provider.tsx` (working name) | `components/auth-provider.tsx` |

Naming above is a starting proposal, not final — confirm before implementation since it affects every import site.

### 3.3 Files to delete once the above is live and verified
- `hooks/useUsername.ts` (already dead per `useIdentity.ts` docstring)
- `hooks/useClaimIdentity.ts` (already dead)
- `components/claim-identity-banner.tsx` (imports the two dead hooks above; not used by anything else per the compose.tsx read-through)

Do not delete any of these until the Supabase identity system is confirmed working end-to-end — per CLAUDE.md Rule 10 (minimal surgical changes, ask before big rewrites), this is a deletion step, not a rewrite, and should be its own small commit.

---

## 4. Schema

```sql
-- profiles: one row per identity. id = same UUID as auth.users, no separate id needed.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null,
  is_artist boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "profiles readable by everyone" on profiles for select using (true);
create policy "user creates own profile" on profiles for insert with check (auth.uid() = id);
create policy "user updates own profile" on profiles for update using (auth.uid() = id);

-- artist_applications: separate table so resubmissions keep history
create table artist_applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  display_artist_name text not null,
  links jsonb not null default '{}',
  note text,
  rights_agreed boolean not null default false,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table artist_applications enable row level security;
create policy "owner reads own application" on artist_applications for select using (auth.uid() = profile_id);
create policy "owner submits application" on artist_applications for insert with check (auth.uid() = profile_id);
-- status changes (approve/reject) intentionally have no client policy — admin-only via service role

-- Phase 2 tables, created now so profiles isn't redesigned later
create table follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  followee_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id)
);

alter table follows enable row level security;
create policy "involved parties read follow rows" on follows for select using (auth.uid() = follower_id or auth.uid() = followee_id);
create policy "user creates own follow request" on follows for insert with check (auth.uid() = follower_id);
create policy "followee accepts/declines" on follows for update using (auth.uid() = followee_id);

create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;
create policy "involved parties read messages" on messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "user sends as self" on messages for insert with check (auth.uid() = sender_id);
create policy "recipient marks read" on messages for update using (auth.uid() = recipient_id);
```

**Open question, needs a decision before Phase 2 build starts:** should `follows` require mutual accept (current schema, DM-request-style) or be open follow with no accept step (Instagram-public-account-style)? Growth doc doesn't specify. Affects the `status` column and the UI significantly enough to decide up front.

---

## 5. Phase 2 — Auth Migration (Anonymous → Real Account, Same Identity)

This is the part of `AuthForm.tsx` worth the most care: Firebase's `linkWithCredential` upgrades an anonymous UID to a real account in place, so every post made while anonymous stays attached to the same identity after signup. Supabase Auth supports an equivalent anonymous-to-permanent linking flow, but the exact current method names need to be checked against Supabase's own docs at implementation time rather than assumed from general knowledge — Supabase's auth API has had naming changes across versions, and getting this wrong silently breaks the "same identity before and after signup" guarantee that `AuthForm.tsx`'s comments explicitly call out as intentional.

**Action item:** before writing `useSupabaseIdentity.ts` or the new `AuthForm`, pull current Supabase Auth docs for anonymous sign-in + identity linking. Do not port `AuthForm.tsx`'s method calls 1:1 by name-matching to Firebase.

**What must carry over from the existing `AuthForm.tsx` logic, regardless of exact API names:**
- Silent anonymous sign-in on first visit (current: `AuthProvider` + `signInAnonymously`)
- Email/password and Google OAuth signup, both upgrading the existing anonymous session rather than creating a new one
- The `credential-already-in-use` fallback path (current: if a Google account already has a real Margo account, sign into that instead of failing) — this UX detail matters, don't drop it in the port

---

## 6. Phase 3 — The Firebase↔Supabase Seam

The one place the two systems have to actually meet: a post in `posts/{postId}` (Firebase) currently stores `username: identity.displayName` as a plain string snapshot at post time. Once identity moves to Supabase, new posts need to resolve a profile from Supabase while old posts still carry the old Firebase-snapshot username. Two options:

**Option A — keep the snapshot pattern.** New posts store `authorUid` (already does — validated in the rules patch) and a `username` snapshot at post time, same as today, just sourced from the Supabase profile instead of the Firebase `users/{uid}` node. Simple, no new fetch required to render a post, but a username change on Supabase won't retroactively update old posts' displayed name — matches current behavior exactly, so no regression, just no new "live" benefit either.

**Option B — resolve username live from `authorUid` at render time.** Feed/post components look up the Supabase profile by `authorUid` when rendering. Shows current username always, but adds a fetch (or requires all profiles cached client-side) and needs a fallback for posts made before this system existed (`authorUid` may be null on very old posts, per the original rules — `authorUid` validation only requires it "if it exists").

**Recommendation:** Option A for now — it's the lower-risk, zero-new-fetch path and matches existing behavior, revisit for Option B once follows/profile pages exist and username-freshness actually matters to users. Not decided yet — flag as an open question for confirmation before Phase 3 implementation.

---

## 7. Sequencing & Branching

Per CLAUDE.md Rule 1 (always branch from main): confirm current branch before any of this starts (see chat — branch check pending as of this doc). If on `main`, create `feat/supabase-identity` (or similar) before touching `lib/supabase.ts`.

**Order:**
1. Supabase project + schema (Section 4) — no app code touched yet, safe to do on any branch
2. `lib/supabase.ts` + env vars
3. `useSupabaseIdentity.ts` + new `AuthProvider` + new `AuthForm`, built alongside the existing Firebase identity system (not replacing it yet)
4. Swap `compose/page.tsx` and any other consumer of `useIdentity` over to the new hook, one file at a time, `npx tsc --noEmit` clean after each
5. Delete dead files (Section 3.3) only after step 4 is fully verified working
6. Follows + messages UI (Phase 2 of the platform roadmap) — schema already exists from Section 4, so this is UI-only work at that point

---

## 8. Open Questions

- Follow model: mutual-accept vs. open-follow (Section 4)
- Exact Supabase Auth anonymous-linking API surface — needs current docs check, not assumption (Section 5)
- Option A vs. B for username resolution in posts (Section 6)
- Whether `database.rules.json` + `firebase.json` get checked into git now (low effort, was flagged as a nice-to-have, still not done)
- Working names `useSupabaseIdentity.ts` / `supabase-auth-provider.tsx` (Section 3.2) — confirm or rename before creating

---

*Next step: confirm current git branch, then begin Section 3.1 setup steps.*