/**
 * Read-only sample: compare heuristic Discover moments vs curated (no cache writes).
 *
 *   node --experimental-strip-types scripts/dry-run-curated-sample.ts --limit 10
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { buildLyricMomentsFromRows } from '../lib/lyric-moments-board.ts'
import type { LyricMomentRow } from '../lib/primary-tab-prefetch.ts'
import { curateSongMoments } from '../lib/moments/curate-song.ts'

process.env.MOMENTS_CURATION_ENABLED = 'true'

const limit = (() => {
  const i = process.argv.indexOf('--limit')
  return i >= 0 ? parseInt(process.argv[i + 1] || '10', 10) : 10
})()

async function loadMomentRows(supabase: ReturnType<typeof createClient>, songId: string): Promise<LyricMomentRow[]> {
  const { data } = await supabase
    .from('lyric_lines')
    .select(`
      line_index, text, start_sec, end_sec, song_id,
      lyric_line_vibes!inner ( vibe ),
      songs!inner ( id, title, artist_display_name, artwork_url, audio_url, status, atmosphere )
    `)
    .eq('song_id', songId)
  const out: LyricMomentRow[] = []
  for (const row of data || []) {
    const song = Array.isArray(row.songs) ? row.songs[0] : row.songs
    if (!song || song.status === 'hidden') continue
    const vibes = (row.lyric_line_vibes || []).map((v: { vibe: string }) => v.vibe).filter(Boolean)
    if (!vibes.length) continue
    out.push({
      lineIndex: row.line_index,
      text: row.text,
      startSec: Number(row.start_sec),
      endSec: Number(row.end_sec),
      songId: song.id,
      songTitle: song.title,
      artist: song.artist_display_name,
      artwork: song.artwork_url,
      audioUrl: song.audio_url,
      vibes,
    })
  }
  return out
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || !process.env.OPENAI_API_KEY) {
    console.error('Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY')
    process.exit(1)
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { data: songs } = await supabase
    .from('songs')
    .select('id, title')
    .neq('status', 'hidden')
    .order('plays', { ascending: false })
    .limit(limit)

  for (const song of songs || []) {
    const rows = await loadMomentRows(supabase, song.id)
    const oldMoments = buildLyricMomentsFromRows(rows, {}).filter((m) => m.songId === song.id).slice(0, 6)
    const curated = await curateSongMoments({
      supabaseAdmin: supabase,
      songId: song.id,
      writeCache: false,
      force: true,
    })
    console.log('\n===', song.title, '===\n')
    console.log('OLD (heuristic):')
    oldMoments.forEach((m, i) => console.log(`  ${i + 1}.`, m.line.replace(/\n/g, ' / ')))
    console.log('NEW (curated):')
    if (curated.status === 'curated' || curated.status === 'cached') {
      curated.moments.forEach((m, i) => console.log(`  ${i + 1}.`, m.text.replace(/\n/g, ' / '), `[${m.reason}]`))
    } else {
      console.log('  (failed)', curated.status === 'failed' ? curated.reason : curated.status)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
