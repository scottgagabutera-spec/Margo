# PR A — speed + profile crash (measurement notes)

## Profile crash — root cause

| Item | Detail |
|------|--------|
| **Symptom** | You/Profile pane shows **Retry** and `Ref: Cannot read` from `MargoPaneErrorBoundary` |
| **Mechanism** | Error reference exposed the first 12 chars of `error.message` (e.g. `Cannot read p…`) |
| **Root cause** | During username transitions, `loading` stayed **false** while `profile` was **null**. `ProfileHeroVisitorActions` evaluated `profile!.username` whenever `user && !isOwnProfile`, throwing before the `profile &&` render guard. |
| **Contributing** | `favorite-artist-avatar` passed the whole `portraitFallbackFromSeed()` object as `background` (invalid style; fixed). |
| **Fix** | Set `loading` true when peek cache misses; guard hero actions on `profile`; sanitize pane ref via `errorReferenceLine()`. |

## Before (code-path estimate, #360 stack)

Profile open triggered `warmProfile` → `Promise.all([peek bundle, /api/profile/surface])`. Surface called `loadProfileFavoriteArtists`, which issued **one Deezer HTTP search per favorite artist** (N external calls, sequential bounded only by `Promise.all` on artists). That blocked first paint and doubled memory fetches (`useProfileMemories` always hit `/api/memories` immediately).

| Screen | Dominant waits (estimated) | API-ish calls |
|--------|---------------------------|---------------|
| Profile own | surface + Deezer × favorites + `/api/memories` | 3–8+ |
| Profile other | same | 3–8+ |
| Feed Lyrics | `usePosts` realtime + memories feed mix | 2–3 |
| Feed Memories | grid page fetch | 1 |
| Feed Shorts | clips hook | 1–2 |
| Discover | page queries | 2–4 |
| Memory detail | memory by id + assemble | 2–3 |
| Hub | tiles / notifications | 1–2 |

### Slow endpoints (before, likelihood)

1. `/api/profile/surface` (Deezer inside favorites loader)
2. `/api/memories` (duplicate with surface)
3. `profile_peek_for_username` RPC
4. `/api/memories/feed`
5. `usePosts` initial select
6. Artist discography client query + `song_stats` (profile only)
7. `/api/genius` (compose/search only — not profile)
8. `/api/artists/search` (picker only)
9. `/api/songs/search`
10. Signature song snippet resolver (profile, when signature set)

## After (this PR)

- **No Deezer** on profile surface path.
- **Profile bundle** returns from peek/DB first; **surface** merges in background + `margo-profile-surface-ready` event.
- **Memories hook** uses 90s stale-while-revalidate; skips repeat fetch when warm.
- **Pane errors** show digest or generic ref, not raw V8 messages.

## Regions (report for Scott)

| Layer | Config in repo | Notes |
|-------|----------------|-------|
| Vercel functions | No `regions` in `vercel.json` (default multi-edge) | Set `iad1` or match Supabase region in dashboard for API routes |
| Supabase | Project-specific (dashboard) | Compare with Vercel production region; Manila users benefit when DB + compute share region |
| Latency | Not measurable from repo | Ping Supabase API URL vs Vercel deployment URL from PH once regions are known |

## Budgets (verify on phone)

| Budget | Target |
|--------|--------|
| Cached tab switch | &lt;100ms paint |
| First data on screen | &lt;400ms median on 4G |
| Skeleton max | &lt;1s without cached content |
| Profile crash | none |

## After timings

Re-run the same flows on preview after deploy; compare DevTools Network (disable cache) for `/api/profile/surface` duration and call count.
