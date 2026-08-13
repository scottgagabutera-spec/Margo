# Margo — Project Map

> File-level inventory for the **live** Next.js app (post-hygiene PR #86).  
> Companion architecture map: `ARCHITECTURE.md`. Session laws: `CLAUDE.md`.

**Convention**

- Routine files: one-line purpose.
- **Careful:** only for high-risk or non-obvious behavior. Prefer strong inline comments over restating them here.
- Update a row when a file’s purpose changes meaningfully. Do not aim for exhaustive gotchas — they go stale.

Legacy vanilla (`js/`, root `api/*.js`, `index.html`) was removed in hygiene cleanup. Restore from `origin/main-vanilla-backup` only if needed.

---

## 1. `app/` — routes & layouts

### Shell

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout — fonts, providers, MiniPlayer, nav/tab chrome, Sonner |
| `app/page.tsx` | Marketing landing (own nav) |
| `app/globals.css` | Design tokens, feed/action CSS, safe-area vars |

### Primary product

| File | Purpose |
|------|---------|
| `app/feed/page.tsx` + `feed/layout.tsx` | Main lyric feed |
| `app/discover/page.tsx` + `discover/layout.tsx` | Discover Moments / browse |
| `app/discover/songs/page.tsx` | Full catalog grid |
| `app/song/[id]/page.tsx` | Karaoke / full song player (canonical; replaces old `/music/player`) |
| `app/compose/page.tsx` + `compose/layout.tsx` | Post a lyric |
| `app/lyric-back/page.tsx` + `lyric-back/layout.tsx` | Reply with a lyric |
| `app/post/[id]/page.tsx` | Single post thread |

### Account & social

| File | Purpose |
|------|---------|
| `app/signin/page.tsx` | Sign in / up entry |
| `app/auth/callback/route.ts` | OAuth / auth callback |
| `app/settings/page.tsx` | Account settings, deletion |
| `app/profile/[username]/page.tsx` | Public profile |
| `app/profile/[username]/songs/page.tsx` | Profile song grid |
| `app/profile/edit/page.tsx` | Edit own profile |
| `app/messages/page.tsx`, `messages/[username]/page.tsx` | DM list + thread |
| `app/notifications/page.tsx` | Alerts |
| `app/studio/page.tsx` | Artist studio |
| `app/apply-artist/page.tsx` | Artist application |
| `app/artists/page.tsx` | Artists directory / catalog entry |

### Legal / static

| File | Purpose |
|------|---------|
| `app/about/page.tsx` | About |
| `app/contact/page.tsx` | Contact mailboxes |
| `app/privacy/page.tsx` | Privacy policy |
| `app/terms/page.tsx` | Terms of use |
| `app/dmca/page.tsx` | Copyright / DMCA policy + designated-agent contact |

### Admin

| File | Purpose |
|------|---------|
| `app/admin/page.tsx` | Admin dashboard (no MargoNav) |

### `app/api/`

| Route | Purpose |
|-------|---------|
| `api/auth/*` | Cookie login, logout, me, refresh, signup, OAuth, password |
| `api/suggest-lyric-back/route.ts` | Suggested Lyric Back ranking API |
| `api/genius/route.ts` | Genius lyric/song search |
| `api/emotion/route.ts` | Emotion classification |
| `api/moderate/route.ts` | OpenAI moderation on write; may bump `posts.flag_count` |
| `api/whisper/route.ts` | Transcription for Studio uploads |
| `api/tag-vibes/route.ts` | Vibe tags for lyric lines |
| `api/delete-account/route.ts` | Account deletion |
| `api/submit-artist-application/route.ts` | Artist apply |
| `api/verify-artist-link/route.ts` | Link verification (incl. Suno) |
| `api/import-linktree/route.ts` | Linktree import helper |
| `api/admin/session/route.ts` | Admin session assert |
| `api/admin/overview/route.ts` | Overview KPIs |
| `api/admin/catalog-songs/route.ts`, `catalog-posts/route.ts` | Catalog ops |
| `api/admin/artist-applications/route.ts`, `artist-moderation/route.ts` | Artist pipeline |
| `api/admin/post-reports/route.ts` | User reports |
| `api/admin/featured/route.ts` | Featured exchange |
| `api/admin/featured/import-rtdb/route.ts` | **Careful:** Firebase RTDB → featured one-shot; not the live catalog write path |

**Careful (API):** `api/auth/*` (cookie contract); `api/delete-account`; `api/suggest-lyric-back` (cache + status=`active` filter — see inline comments); `api/moderate` (flag_count side effect); `api/admin/featured/import-rtdb`.

---

## 2. `components/`

### Product chrome

| File | Purpose |
|------|---------|
| `margo-nav.tsx` | Desktop / shared top nav |
| `mobile-tab-bar.tsx` | Primary tab bar |
| `primary-tab-shell.tsx` | Keepalive panes + swipe host |
| `mini-player.tsx` | Global snippet player bar |
| `audio-engine-provider.tsx` | Mounts audio engine context |
| `admin-trigger.tsx` | Hidden B+G / long-press admin entry |
| `margo-search-input.tsx`, `margo-skeletons.tsx` | Search + loading skeletons |
| `pull-to-refresh.tsx`, `loading-ring.tsx`, `new-items-pill.tsx` | Feed/Discover chrome |
| `keyboard-safe-cta-bar.tsx` | Keyboard-aware CTA bar |
| `hub-menu.tsx` | Hub panel + Library/Messages/Alerts tiles |

### Cards & feed

| File | Purpose |
|------|---------|
| `post-card.tsx` | Feed/Discover post card (variants: feed, compact, row, …) |
| `post-card-suggested-reply.tsx` | On-demand Suggested Lyric Back UI |
| `post-thumbnail.tsx` | Artwork / YouTube thumb |
| `replay-attribution.tsx` | Replay wrapper chrome |
| `edit-post-modal.tsx` | Owner edit |
| `vibe-tag.tsx`, `relative-time.tsx`, `username-tag.tsx` | Meta chrome |

**Careful:** `post-card-suggested-reply.tsx` — must stay tap-triggered; talks to suggest API/cache contract. `post-card.tsx` — large surface; many variants and action paths (resonate, Lyric Back, Card, Replay).

### Card export

| File | Purpose |
|------|---------|
| `card-export-modal.tsx` | PNG lyric card export UI (themes/shapes) |

Wired from Feed, Compose, Lyric Back, post thread, profile, song player. Analytics via `lib/engagement/card-exports.ts` (soft-fail; never block download).

### Catalog / studio / auth UI

| File | Purpose |
|------|---------|
| `catalog-grid.tsx`, `song-catalog-card.tsx` | Song grids |
| `save-queue-button.tsx` | Persist audio queue as playlist |
| `compose-line-picker.tsx`, `compose-search-dropdown.tsx` | Compose/Lyric Back search UI |
| `studio/song-upload-form.tsx` | Artist upload + whisper/tag-vibes |
| `artist-application-form.tsx`, `artist-applications-tab.tsx`, `artist-badge.tsx` | Artist apply / admin / badge |
| `auth-form.tsx`, `auth-gate-modal.tsx`, `supabase-auth-provider.tsx` | Auth UI + gate |
| `avatar-upload.tsx`, `back-button.tsx` | Profile / nav helpers |
| `discover-error-boundary.tsx` | Discover crash boundary |
| `post-reports-tab.tsx` | Admin reports UI |
| `notification-item.tsx`, `notification-list.tsx` | Alerts list UI (entry via Hub) |
| `MargoLogo.tsx`, `play-pause-icon.tsx`, `heart-icon.tsx` | Brand / playback / resonate icons |
| `icons/*` | Shared SVG icon set + barrel `icons/index.ts` |
| `ui/sonner.tsx` | Toast host (only remaining shadcn primitive) |

---

## 3. `hooks/`

| File | Purpose |
|------|---------|
| `usePosts.ts`, `usePost.ts` | Feed posts / single post |
| `useEchoes.ts` | Lyric Backs for a post |
| `useSongs.ts`, `useSong.ts` | Catalog list / single song + lines |
| `useSharedLines.ts` | Shared-line signals |
| `useLyricMoments.ts` | Discover Moments |
| `useRecentReplays.ts`, `useProfileReplays.ts` | Replay feeds |
| `useOwnPrivatePosts.ts` | Owner private posts |
| `useVisibleAuthorIds.ts` | Visibility filter for posts |
| `useAuthorProfile.ts`, `useAuthorLyricBacks.ts` | Author meta |
| `useIdentity.tsx` | Signed-in profile / session facade |
| `useMessaging.tsx`, `useConversations.ts`, `useThread.ts`, `useUnreadMessagesCount.ts` | DMs |
| `useNotifications.tsx` | Alerts |
| `useAudioEngine.ts` | Engine React bindings |
| `useNewItemsBuffer.ts` | PTR / “new items” pill |
| `useArtistApplication.ts` | Artists |
| `useTabSwipe.tsx`, `usePrimaryTabSwipeGesture.ts` | Primary-tab swipe |
| `useVisualViewport.ts` | Visual viewport for mobile chrome |

**Careful:** `usePosts.ts` (visibility + replay merge); `useIdentity.tsx`; `usePrimaryTabSwipeGesture.ts` / `useTabSwipe.tsx` (gesture vs scroll exclusions).

---

## 4. `lib/`

### Supabase / auth

| File | Purpose |
|------|---------|
| `lib/supabase/client.ts` | Browser cookie client |
| `lib/supabase/server.ts` | Server cookie client |
| `lib/supabase/cookie-options.ts` | Cookie options |
| `lib/supabase/auth-broadcast.ts` | Same-tab auth broadcast |
| `lib/supabase/clear-legacy-auth-storage.ts` | Clears old localStorage auth |
| `lib/supabase-admin.ts` | Service-role admin client |

**Careful:** cookie/session contract across `lib/supabase/*` and `app/api/auth/*`.

### Audio engine

| File | Purpose |
|------|---------|
| `lib/audio-engine/engine.ts` | Core playback / queue |
| `lib/audio-engine/index.ts` | Public API |
| `lib/audio-engine/media-session.ts` | Media Session wiring |
| `lib/audio-engine/preload-cache.ts` | URL warm/preload |
| `lib/audio-engine/snippet-resolver.ts` | Snippet resolution |
| `lib/audio-engine/types.ts` | Shared types |

**Careful:** `engine.ts` — single-instance semantics; Media Session must call real `play`/`pause`. See also `docs/TARGET_ARCHITECTURE_AUDIO_ENGAGEMENT.md` (mostly shipped).

### Suggest / catalog / posts

| File | Purpose |
|------|---------|
| `lib/suggest-lyric-back.ts` | Rank + diversity assemble + cache |
| `lib/catalog-lyric-unit.ts` | Adjacent-line catalog units |
| `lib/search-margo-songs.ts` | Tokenized catalog search |
| `lib/search-profiles.ts` | Profile search |
| `lib/post-lines.ts` | Post line timing helpers |
| `lib/lyric-match.ts` | Snippet/line matching |
| `lib/feed-replay-map.ts` | `post_replays` → Feed Replay cards |

**Careful:** `suggest-lyric-back.ts` — empty results must not poison cache (#82); soft cross-song diversity assemble (#83); file header documents Approach A. Prefer that comment block over duplicating here.

### Engagement / account / misc

| File | Purpose |
|------|---------|
| `lib/engagement/card-exports.ts` | `card_exports` insert after PNG download |
| `lib/engagement/plays.ts`, `session.ts`, `last-seen.ts` | Plays / session / last_seen |
| `lib/queues.ts` | Save current queue as playlist |
| `lib/purge-user-account.ts` | Full account wipe |
| `lib/profile-lookup.ts` | Username → profile |
| `lib/admin-auth.ts`, `admin-overview-kpis.ts` | Admin assert + KPIs |
| `lib/primary-tab-prefetch.ts`, `primary-tab-warm.ts` | Tab warm/prefetch |
| `lib/tab-swipe-motion.ts` | Swipe spring / rubber-band math |
| `lib/fonts.ts`, `suno.ts`, `perf-trace.ts` | Fonts, Suno URL, perf |

**Careful:** `purge-user-account.ts` (destructive, irreversible).

---

## 5. `supabase/migrations/`

Keep all applied files. Add new dated SQL; never delete history.

Notable recent:

| Migration | One-liner |
|-----------|-----------|
| `20260815_card_exports.sql` | Card export analytics table |
| `20260816_post_lines.sql` | Structured post lyric lines |
| `20260817_suggest_lyric_back_cache.sql` | Suggest cache table |
| `20260814_profiles_last_seen_at.sql` | Identity heartbeat |
| `20260810_complete_account_deletion.sql` | Deletion RPCs / policy |
| `20260808_post_replays.sql` | Replays |
| `20260807_post_reports.sql` | Reports |

---

## 6. `scripts/` and `docs/`

| Path | Purpose |
|------|---------|
| `scripts/migrate-*-to-supabase.mjs` | One-time migration helpers (historical) |
| `scripts/verify-*.mjs` | Cookie / deletion / artist verify checks |
| `scripts/check-songs-count.mjs`, `delete-song.mjs`, `test-tag-vibes-route.mjs` | Ops / route tests |
| `scripts/lib/assert-httponly-auth.mjs` | Shared auth assert for verifies |
| `docs/*` | Plans — many stamped ARCHIVE / SUPERSEDED; verify code before treating as backlog |

---

## 7. Config / root

| File | Purpose |
|------|---------|
| `next.config.mjs` | Image config; permanent redirects (`/music`, `/music/player`, `/privacy.html`, `/copyright-policy`) |
| `package.json` | Scripts / deps |
| `vercel.json` | Framework: nextjs |
| `.env.example` | Env var **names** only (no secrets) |
| `ARCHITECTURE.md` | System map |
| `CLAUDE.md` | Agent / developer laws |
| `MARGO_BRAND.md` | Brand + UI rules |
| `MARGO_RIGHTS_AND_DISCOVERY_PLAN.md` | Rights / discovery strategy |
| `README.md` | Public overview |

---

## 8. High-risk index

Jump list for agents (read inline comments first):

- `lib/suggest-lyric-back.ts` + `app/api/suggest-lyric-back/route.ts` + `components/post-card-suggested-reply.tsx`
- `lib/supabase/*` + `app/api/auth/*` + `components/supabase-auth-provider.tsx`
- `lib/audio-engine/engine.ts` + `components/mini-player.tsx`
- `lib/purge-user-account.ts` + `app/api/delete-account/route.ts`
- `components/primary-tab-shell.tsx` + `hooks/usePrimaryTabSwipeGesture.ts`
- `app/api/moderate/route.ts` (write-path moderation + `flag_count`)
- `components/card-export-modal.tsx` + `lib/engagement/card-exports.ts` (export must not block on analytics)
- `app/dmca/page.tsx` (legal surface — coordinate with Terms/Privacy)
- `app/api/admin/featured/import-rtdb/route.ts` (Firebase one-shot — do not confuse with live catalog writes)

---

*Last updated: August 2026*
