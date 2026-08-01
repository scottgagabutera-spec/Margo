// scripts/migrate-posts-to-supabase.mjs
//
// ONE-TIME MIGRATION — Firebase `posts` (+ nested `echoes`) -> Supabase
// `posts` / `post_stats` / `post_resonates`.
//
// Reads from a single local full-database export JSON, exactly the same
// pattern as migrate-songs-to-supabase.mjs — no firebase-admin, no live
// Firebase connection, no service account credential needed. The export
// must contain the top-level keys `posts`, `postStats`, and `analytics`
// (a full root export from the Firebase console's "Export JSON" does
// this automatically).
//
// USAGE:
//   1. npm install @supabase/supabase-js
//   2. Set env vars (or edit the constants below):
//        SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   3. node scripts/migrate-posts-to-supabase.mjs ./margo-f6da4-default-rtdb-export.json
//
// ── SONG ID RESOLUTION — ✅ CONFIRMED, Aug 1, 2026 ─────────────────────
// songs.id is a fresh uuid; songs.firebase_id (unique) preserves the old
// Firebase key. Resolution is firebase_id, never posts.songId === songs.id.
//
// ── AUTHOR RESOLUTION — ✅ CONFIRMED, Aug 1, 2026 ──────────────────────
// Confirmed by direct export analysis of all 112 Firebase posts: the old
// "authorUid === profiles.id direct match" assumption only holds for 1
// of 112 posts. Everything else predates real accounts (client-generated
// anonymous authorId, username-only, or nothing at all). useIdentity.ts
// confirms accounts + generateUsername() are the CURRENT and ONLY way a
// post gets a real author going forward — this is a closed, historical
// population, not an ongoing gap.
//
// Decision: no fake profiles minted for legacy content. posts.author_
// profile_id is nullable (schema change applied and confirmed live);
// legacy content carries a plain-text, non-clickable legacy_author_label
// instead. Check constraint posts_author_or_legacy_check guarantees every
// post has one or the other, never neither.
//
// ── STRUCTURAL DEDUP — ✅ CONFIRMED, Aug 1, 2026 ───────────────────────
// Direct analysis of the full export found 25 nested echoes (posts/
// {parentId}/echoes/{echoId}), of which EXACTLY 5 are also duplicated as
// standalone top-level posts/{echoId} entries (mode:"reply", replyToId
// set, identical content). This is real duplication in the source data,
// not two different things — same id, same text/timestamp/username, just
// written to two locations by the old client. Migrating both would create
// duplicate rows. Fix: build the full set of nested-echo IDs first, then
// skip any top-level post whose id is in that set — it gets created once,
// correctly, via the nested-echo pass with the right parent_post_id.
// The 20 remaining echoes have no top-level twin and are unaffected.
//
// Also confirmed: echo-level resonates live NESTED INSIDE the echo object
// itself (echo.resonates), never at analytics/{echoId}/resonates — that
// path does not exist in the data. The 3 of the 5 duplicated echoes that
// *do* have a postStats/{id} entry got it via their standalone top-level
// twin (view/resonate tracking followed the standalone copy) — folding
// postStats lookup into the echo pass by shared id picks this up for
// free, no special-casing needed.
//
// ⚠️ NOT HANDLED, FLAGGED NOT GUESSED: exactly 1 entry exists under
// analytics/{postId}/replies/{replyId} — a third, structurally different
// reply shape (anonName, userId, numeric resonates count instead of an
// object) unconnected to posts or echoes. Too small a sample (n=1) and
// too structurally different to safely infer a general mapping. Logged
// under log.unhandledAnalyticsReplies for manual review, not migrated.
//
// Design decisions carried over from the original plan:
//  - Every echo becomes its own real `posts` row with parent_post_id set
//    to its parent's NEW Supabase id — this is what fixes the nested-
//    reply bug (doc Section 8, item 15): posts are self-referencing, so
//    reply-to-a-reply naturally works with no special-casing.
//  - postStats/{id}/{views,resonateCount,echoCount} seed the initial
//    post_stats row. Triggers keep resonate_count/echo_count correct
//    going forward — this script just seeds views (no trigger for that,
//    same as song_plays being session-based) and resonate/echo counts as
//    a safe historical starting point.
//
// ── FIX, Aug 1, 2026 ────────────────────────────────────────────────────
// `crypto.randomUUID()` was used below without importing `crypto` — on
// Node <19 (no global crypto) this throws `crypto is not defined` on the
// very first post. Added the explicit import so this runs regardless of
// Node version / platform.
//
// ── FIX, Aug 1, 2026 (env vars) ─────────────────────────────────────────
// Plain `node` does NOT auto-load .env.local — that's a Next.js-only
// convention. Run this with `node --env-file=.env.local scripts/...` (Node
// 20.6+) or set the vars manually in the shell first. Also: this project's
// .env.local names the URL var NEXT_PUBLIC_SUPABASE_URL (same convention
// used for the songs migration), not a bare SUPABASE_URL — so both names
// are checked below, NEXT_PUBLIC_SUPABASE_URL first since that's what's
// actually in .env.local.

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import crypto from 'crypto'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://YOUR-PROJECT.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR-SERVICE-ROLE-KEY'

if (SUPABASE_URL === 'https://YOUR-PROJECT.supabase.co' || SUPABASE_SERVICE_ROLE_KEY === 'YOUR-SERVICE-ROLE-KEY') {
  console.error(
    'Missing Supabase credentials. Run with: node --env-file=.env.local scripts/migrate-posts-to-supabase.mjs <export.json>\n' +
    'or set $env:NEXT_PUBLIC_SUPABASE_URL / $env:SUPABASE_SERVICE_ROLE_KEY manually first.'
  )
  process.exit(1)
}

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: node scripts/migrate-posts-to-supabase.mjs <path-to-firebase-full-export.json>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// ── Logging / audit trail ─────────────────────────────────────────────
const log = {
  totalPosts: 0,
  dedupedTopLevelEchoes: 0, // top-level posts skipped because they're a duplicate of a nested echo
  totalEchoes: 0,
  realAuthorCount: 0,
  legacyAuthorCount: 0,
  unresolvedSongIds: [],
  unhandledAnalyticsReplies: [], // the n=1 third reply mechanism, flagged not migrated
  idMap: {},
  errors: [],
}

// ── SONG ID RESOLUTION ──────────────────────────────────────────────────
async function resolveSongId(firebaseSongId) {
  if (!firebaseSongId) return null
  const { data, error } = await supabase
    .from('songs')
    .select('id')
    .eq('firebase_id', firebaseSongId)
    .maybeSingle()
  if (error || !data) return null
  return data.id
}

// ── AUTHOR RESOLUTION ────────────────────────────────────────────────────
function resolveLegacyLabel(rawUsername) {
  const trimmed = (rawUsername || '').trim()
  return trimmed || 'Founding Listener'
}

async function resolveAuthor(rawUsername, authorUid) {
  if (authorUid) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authorUid)
      .maybeSingle()
    if (!error && data) {
      log.realAuthorCount++
      return { authorProfileId: data.id, legacyAuthorLabel: null }
    }
  }
  log.legacyAuthorCount++
  return { authorProfileId: null, legacyAuthorLabel: resolveLegacyLabel(rawUsername) }
}

// ── Core migration ──────────────────────────────────────────────────────
async function migratePosts() {
  const raw = readFileSync(inputPath, 'utf-8')
  const exportData = JSON.parse(raw)

  const postsRaw = exportData.posts || {}
  const postStats = exportData.postStats || {}
  const analytics = exportData.analytics || {}

  // Pass 1: collect every nested echo id across all posts, so top-level
  // duplicates of them can be skipped in Pass 2.
  const allEchoIds = new Set()
  for (const post of Object.values(postsRaw)) {
    for (const eid of Object.keys(post.echoes || {})) {
      allEchoIds.add(eid)
    }
  }

  // Flag the one-off third reply mechanism for manual review, not migrated.
  for (const [parentId, a] of Object.entries(analytics)) {
    for (const [replyId, reply] of Object.entries(a.replies || {})) {
      log.unhandledAnalyticsReplies.push({ parentFbPostId: parentId, replyId, reply })
    }
  }

  // Pass 2: migrate top-level posts, skipping ones that are just a
  // duplicate of a nested echo (handled correctly in Pass 3 instead).
  for (const [fbPostId, post] of Object.entries(postsRaw)) {
    log.totalPosts++

    if (allEchoIds.has(fbPostId)) {
      log.dedupedTopLevelEchoes++
      continue
    }

    const { authorProfileId, legacyAuthorLabel } = await resolveAuthor(post.username, post.authorUid)

    const songId = post.songId ? await resolveSongId(post.songId) : null
    if (post.songId && !songId) log.unresolvedSongIds.push({ fbPostId, firebaseSongId: post.songId })

    const newPostId = crypto.randomUUID()
    log.idMap[fbPostId] = newPostId

    const { error: insertErr } = await supabase.from('posts').insert({
      id: newPostId,
      author_profile_id: authorProfileId,
      legacy_author_label: legacyAuthorLabel,
      text: post.text || '',
      emotion: post.emotion || null,
      status: post.status === 'hidden' ? 'hidden' : post.status === 'private' ? 'private' : 'active',
      flag_count: post.flagCount || 0,
      song_id: songId,
      song_title: post.knowledge?.song || null,
      artist_name: post.knowledge?.artist || null,
      artwork_url: post.knowledge?.artwork || null,
      genius_id: post.knowledge?.geniusId || null,
      youtube_video_id: post.youtubeMeta?.videoId || null,
      youtube_title: post.youtubeMeta?.title || null,
      youtube_thumbnail: post.youtubeMeta?.thumbnail || null,
      youtube_channel: post.youtubeMeta?.channel || null,
      youtube_url: post.youtubeMeta?.youtubeUrl || null,
      parent_post_id: null,
      lang: post.lang || null,
      created_at: post.timestamp ? new Date(post.timestamp).toISOString() : new Date().toISOString(),
    })
    if (insertErr) { log.errors.push({ fbPostId, stage: 'insert-post', error: insertErr.message }); continue }

    const stats = postStats[fbPostId] || {}
    await supabase.from('post_stats').upsert({
      post_id: newPostId,
      views: stats.views || 0,
      resonate_count: stats.resonateCount || 0,
      echo_count: stats.echoCount || 0,
    })

    const resonates = analytics[fbPostId]?.resonates || {}
    for (const actorId of Object.keys(resonates)) {
      await supabase.from('post_resonates').insert({ post_id: newPostId, actor_id: actorId }).select()
    }

    // ── Echoes -> their own posts rows, parent_post_id = newPostId ──
    // Confirmed: zero echoes carry authorUid/authorId, only `username`,
    // always an anonymized handle. Every echo is legacy content by
    // definition — no real-profile path exists for it.
    for (const [fbEchoId, echo] of Object.entries(post.echoes || {})) {
      log.totalEchoes++

      const echoLegacyLabel = resolveLegacyLabel(echo.username)
      log.legacyAuthorCount++

      const newEchoId = crypto.randomUUID()
      log.idMap[fbEchoId] = newEchoId

      const { error: echoInsertErr } = await supabase.from('posts').insert({
        id: newEchoId,
        author_profile_id: null,
        legacy_author_label: echoLegacyLabel,
        text: echo.lyric || '',
        emotion: echo.emotion || null,
        status: echo.status === 'hidden' ? 'hidden' : 'active',
        song_title: echo.song || null,
        artist_name: echo.artist || null,
        parent_post_id: newPostId, // the actual bug fix: real FK, real depth
        created_at: echo.timestamp ? new Date(echo.timestamp).toISOString() : new Date().toISOString(),
      })
      if (echoInsertErr) { log.errors.push({ fbEchoId, stage: 'insert-echo', error: echoInsertErr.message }); continue }

      // Folds in postStats tracked under the echo's own id, if any exists
      // (this is how the 3 duplicated echoes that had real tracked views/
      // resonates via their standalone twin get correct historical stats).
      const echoStats = postStats[fbEchoId] || {}
      await supabase.from('post_stats').upsert({
        post_id: newEchoId,
        views: echoStats.views || 0,
        resonate_count: echoStats.resonateCount || 0,
        echo_count: echoStats.echoCount || 0,
      })

      // Echo resonates are nested directly inside the echo object itself —
      // confirmed, NOT at analytics/{echoId}/resonates (that path never
      // exists in the data).
      const echoResonates = echo.resonates || {}
      for (const actorId of Object.keys(echoResonates)) {
        await supabase.from('post_resonates').insert({ post_id: newEchoId, actor_id: actorId }).select()
      }
    }
  }
}

// ── Run ──────────────────────────────────────────────────────────────
migratePosts()
  .then(() => {
    mkdirSync('./scripts/output', { recursive: true })
    writeFileSync('./scripts/output/posts-migration-log.json', JSON.stringify(log, null, 2))
    console.log('--- Posts migration complete ---')
    console.log(`Top-level posts seen: ${log.totalPosts}`)
    console.log(`Deduped (standalone twin of a nested echo, skipped): ${log.dedupedTopLevelEchoes}`)
    console.log(`Echoes migrated: ${log.totalEchoes}`)
    console.log(`Real author (profile-linked): ${log.realAuthorCount}`)
    console.log(`Legacy author (label only): ${log.legacyAuthorCount}`)
    console.log(`Unresolved song links: ${log.unresolvedSongIds.length}`)
    console.log(`Unhandled analytics/*/replies (not migrated, flagged): ${log.unhandledAnalyticsReplies.length}`)
    console.log(`Errors: ${log.errors.length}`)
    console.log('Full log written to scripts/output/posts-migration-log.json')
    if (log.unresolvedSongIds.length > 0) {
      console.warn('⚠️  Unresolved song links exist — review before trusting song_id data.')
    }
    if (log.unhandledAnalyticsReplies.length > 0) {
      console.warn('⚠️  Unhandled analytics/*/replies entries exist — review scripts/output/posts-migration-log.json.')
    }
  })
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
