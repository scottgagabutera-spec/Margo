// migrate-songs-to-supabase.mjs
//
// Migrates the Firebase Realtime Database `songs` export into Supabase:
//   songs               (one row per song)
//   lyric_lines          (one row per SRT block)
//   lyric_line_vibes     (one row per vibe tag on a line)
//   song_stats           (seeded from Firebase plays / lyricUses)
//
// USAGE:
//   1. npm install @supabase/supabase-js
//   2. Set env vars (or edit the constants below):
//        SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   3. node migrate-songs-to-supabase.mjs ./margo-f6da4-default-rtdb-songs-export.json
//
// SAFE TO RE-RUN: upserts songs on firebase_id (now a unique column on
// public.songs), and fully replaces lyric_lines / lyric_line_vibes for a
// song before reinserting — so re-running never duplicates rows.
//
// Schema confirmed live against public.songs:
//   id, owner_profile_id (uuid, NOT NULL), title, artist_display_name,
//   artwork_url, audio_url, description, status (default 'draft'),
//   coming_soon_label, "order" (int), youtube_url, spotify_url,
//   apple_music_url, soundcloud_url, audiomack_url, boomplay_url,
//   duration_sec, created_at, updated_at, firebase_id (added, unique)
//
// All 10 Firebase songs belong to the "Trymargo" catalog, now owned by the
// dedicated margo artist account (not your personal scott account).
// ──────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://YOUR-PROJECT.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR-SERVICE-ROLE-KEY'

// Confirmed: margo / is_artist = true / artist_status = active
const OWNER_PROFILE_ID = '063d94b6-9460-43b3-9c4a-91fa8fe9f635'

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: node migrate-songs-to-supabase.mjs <path-to-firebase-export.json>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// ── SRT parsing ───────────────────────────────────────────────────────────
// Mirrors the exact parsing logic already used client-side in the /music
// LyricBoard component, so migrated rows line up 1:1 with what the app
// already treats as "line N" for lineVibes indexing.
function parseSrt(srt) {
  if (!srt) return []
  const blocks = srt.trim().split(/\n\s*\n/)
  const lines = []
  blocks.forEach((block, i) => {
    const parts = block.trim().split('\n')
    if (parts.length < 3) return
    const match = parts[1].match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    )
    if (!match) return
    const toSec = (h, m, s, ms) =>
      parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000
    const text = parts.slice(2).join(' ').trim()
    lines.push({
      lineIndex: i,
      text,
      startSec: toSec(match[1], match[2], match[3], match[4]),
      endSec: toSec(match[5], match[6], match[7], match[8]),
    })
  })
  return lines
}

// ── Main migration ────────────────────────────────────────────────────────
async function migrate() {
  const raw = readFileSync(inputPath, 'utf-8')
  const firebaseSongs = JSON.parse(raw)

  const entries = Object.entries(firebaseSongs)
  console.log(`Found ${entries.length} songs in Firebase export.\n`)

  for (const [firebaseId, song] of entries) {
    console.log(`── ${song.title} (${firebaseId}) ──`)

    const parsedLines = parseSrt(song.srt)
    const durationSec =
      parsedLines.length > 0 ? parsedLines[parsedLines.length - 1].endSec : null

    // 1. Upsert into `songs`
    const { data: songRow, error: songErr } = await supabase
      .from('songs')
      .upsert(
        {
          firebase_id: firebaseId,
          owner_profile_id: OWNER_PROFILE_ID,
          title: song.title,
          artist_display_name: song.artist,
          artwork_url: song.artwork || null,
          audio_url: song.audioUrl || null,
          description: song.description || null,
          status: song.status || 'live',
          coming_soon_label: song.comingSoonLabel || null,
          order: typeof song.order === 'number' ? song.order : null,
          youtube_url: song.youtubeUrl || null,
          spotify_url: song.spotifyUrl || null,
          apple_music_url: song.appleMusicUrl || null,
          soundcloud_url: song.soundcloudUrl || null,
          audiomack_url: song.audiomackUrl || null,
          boomplay_url: song.boomplayUrl || null,
          duration_sec: durationSec,
          created_at: song.createdAt ? new Date(song.createdAt).toISOString() : null,
        },
        { onConflict: 'firebase_id' }
      )
      .select('id')
      .single()

    if (songErr) {
      console.error(`  ✗ songs upsert failed:`, songErr.message)
      continue
    }
    const songId = songRow.id
    console.log(`  ✓ songs row: ${songId}`)

    // 2. Parse SRT into lyric_lines
    if (parsedLines.length === 0) {
      console.log(`  ⚠ no parseable SRT lines, skipping lyric_lines/vibes`)
      continue
    }

    // Clean re-run: wipe existing lines for this song before reinserting.
    await supabase.from('lyric_lines').delete().eq('song_id', songId)

    const lineRows = parsedLines.map((l) => ({
      song_id: songId,
      line_index: l.lineIndex,
      text: l.text,
      start_sec: l.startSec,
      end_sec: l.endSec,
    }))

    const { data: insertedLines, error: linesErr } = await supabase
      .from('lyric_lines')
      .insert(lineRows)
      .select('id, line_index')

    if (linesErr) {
      console.error(`  ✗ lyric_lines insert failed:`, linesErr.message)
      continue
    }
    console.log(`  ✓ inserted ${insertedLines.length} lyric_lines`)

    // 3. Expand lineVibes[] into lyric_line_vibes rows
    const lineVibes = song.lineVibes || []
    const vibeRows = []
    for (const line of insertedLines) {
      const vibes = lineVibes[line.line_index]
      if (!vibes || !Array.isArray(vibes)) continue
      for (const vibe of vibes) {
        vibeRows.push({ line_id: line.id, vibe })
      }
    }

    if (vibeRows.length > 0) {
      const { error: vibesErr } = await supabase.from('lyric_line_vibes').insert(vibeRows)
      if (vibesErr) {
        console.error(`  ✗ lyric_line_vibes insert failed:`, vibesErr.message)
      } else {
        console.log(`  ✓ inserted ${vibeRows.length} lyric_line_vibes`)
      }
    }

    // 4. Seed song_stats from Firebase counters
    const { error: statsErr } = await supabase
      .from('song_stats')
      .upsert(
        {
          song_id: songId,
          plays: song.plays || 0,
          resonate_count: song.resonates || 0,
          lyric_uses: song.lyricUses || 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'song_id' }
      )

    if (statsErr) {
      console.error(`  ✗ song_stats upsert failed:`, statsErr.message)
    } else {
      console.log(
        `  ✓ song_stats seeded (plays=${song.plays || 0}, resonates=${song.resonates || 0}, lyricUses=${song.lyricUses || 0})`
      )
    }

    console.log('')
  }

  console.log('Migration complete.')
}

migrate().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
