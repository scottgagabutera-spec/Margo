# Margo — Auth Cookie Migration Plan

Status: PLANNED — not started. Long-term architectural workstream,
same tier as the Firebase→Supabase migration. Do not start until that
migration's active phases are stable, unless prioritized otherwise.

## Why

Margo's session currently lives in `localStorage` via the plain
`@supabase/supabase-js` browser client (`lib/supabase.ts`). This works,
but has two real long-term costs:

1. **Security.** localStorage is readable by any JavaScript on the
   page. An XSS bug anywhere (comment field, bio, lyric render) becomes
   a session-theft vector. httpOnly cookies are invisible to page
   JavaScript entirely.
2. **No server-side session awareness.** Every page currently renders
   client-first, then checks auth after mount — meaning there's a flash
   before Margo knows who's logged in, and server components /
   middleware cannot make auth-aware decisions before rendering.

Target: `@supabase/ssr` with httpOnly cookie-based sessions, matching
Supabase's current recommended pattern for Next.js App Router apps.

## Audit findings (as of Aug 2026)

- **0** server components import `@/lib/supabase`
- **0** `app/api/**/route.ts` routes import it (they use
  `getSupabaseAdmin()` or local `createClient` instances)
- **39 files** total import `{ supabase }` from `@/lib/supabase`:
  12 client pages, 9 client components, 18 client hooks
- OAuth (Google/Discord) is PKCE code-exchange, but the exchange
  happens **client-side** in `app/auth/callback/page.tsx` — no server
  Route Handler exists today
- Two routes already do server-side session verification, but via
  `Authorization: Bearer <access_token>` header, not cookies:
  `POST /api/delete-account`, `POST /api/submit-artist-application`
- Everything else is gated client-side via `useAuthGate()` /
  `supabase-auth-provider.tsx`, backed by RLS on the anon key — this
  pattern does not need to change; only how the session reaches the
  server changes
- Admin catalog/reports APIs use Firebase admin tokens, unrelated to
  this migration

## Phases

Each phase is its own `feat/...` branch, its own `npx tsc --noEmit` +
`npm run build` pass, its own verification before merge — same
discipline as the account-deletion fix.

### Phase 1 — New clients + middleware (additive, zero risk)
Build `lib/supabase/client.ts` (browser, `createBrowserClient`),
`lib/supabase/server.ts` (server, `createServerClient` reading/writing
cookies via `next/headers`), and root `middleware.ts` (refreshes
session cookie on every request). Old `lib/supabase.ts` untouched.
Nothing switches over yet — deployable with zero behavior change.

### Phase 2 — OAuth callback becomes a server Route Handler — COMPLETE
Replace the client-side exchange in `app/auth/callback/page.tsx` with
`app/auth/callback/route.ts`, using the new server client to exchange
the code and set the cookie, then redirect to `/feed`.
**Verify manually:** sign out, sign in with Google, confirm landing on
`/feed` logged in, confirm a session cookie now exists in dev tools.

**Interim state (expected until Phase 4):** cookie session now works via
the new server route, but `useIdentity` / `supabase-auth-provider.tsx`
still write profile data via the old localStorage client, causing an RLS
`42501` error on profile writes until Phase 4 lands. Known/expected —
not a regression.

### Phase 3 — Switch the two server-verified API routes
`delete-account` and `submit-artist-application` move from Bearer
header to reading the session cookie via the new server client.
Reuse the existing verification-script pattern from the account
deletion fix.

**Dual-accept bridge (temporary until Phase 5):** both routes prefer
cookie `auth.getUser()`, then fall back to `Authorization: Bearer` so
unmigrated callers keep working. Exists only for:
`app/settings/page.tsx` and `hooks/useArtistApplication.ts`. Remove the
Bearer fallback from both API routes once those two files are switched
over in Phase 5.

### Phase 4 — `supabase-auth-provider.tsx` + `useIdentity.tsx`
The load-bearing piece nearly everything else depends on. Swap the
internal `supabase` import to the new browser client.
`onAuthStateChange` / `getSession()` exist on both clients with the
same shape, so this should be close to a like-for-like swap.
**Verify:** auth gate opens/closes correctly on a sample of gated
pages (compose, feed, profile) before moving on.

### Phase 5 — Remaining 33 files, batched by risk
- **Batch A** — 18 hooks (mostly RLS reads, lower risk, first)
- **Batch B** — 9 components
- **Batch C** — 12 pages, saving `margo-nav`, `mobile-account-menu`,
  `settings`, `profile/[username]`, `auth-form` for last (these touch
  `signOut` directly)

Each batch is its own branch, own tsc/build check, merged before the
next batch starts.

### Phase 6 — Remove the old client
Delete `lib/supabase.ts`. Confirm with
`grep -r "from '@/lib/supabase'"` that nothing outside the new files
references it.

### Phase 7 — Update Privacy Policy Section 5
Once real cookies exist, Section 5 needs another honest pass —
naming the actual cookie, its purpose, and its httpOnly/secure flags,
replacing the current "no auth cookies" language.

## Non-goals

- RLS policies do not need to change — they already work off the
  Supabase session regardless of where it's stored.
- Firebase admin-token auth for admin APIs is unrelated and untouched.
- No change to client-side gating UX (`useAuthGate`, `AuthGateModal`)
  — only the transport of the session token changes.