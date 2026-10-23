/**
 * Compare unified song search for two queries (panel vs edit share one function).
 * Usage: NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... node scripts/lyric-back-search-compare.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const modUrl = pathToFileURL(`${process.cwd()}/lib/song-search/unified-song-search.ts`).href
const { fetchUnifiedSongSearchHits } = await import(modUrl)
const supabase = createClient(url, key)

const queries = [
  { label: 'margo-ish', q: 'love' },
  { label: 'third-party', q: 'bad guy billie' },
]

for (const { label, q } of queries) {
  const panel = await fetchUnifiedSongSearchHits(supabase, q, 10)
  const edit = await fetchUnifiedSongSearchHits(supabase, q, 10)
  const same = JSON.stringify(panel) === JSON.stringify(edit)
  console.log(`[${label}] query="${q}" hits=${panel.length} parity=${same}`)
  for (const h of panel.slice(0, 3)) {
    console.log(`  - ${h.title} | ${h.artist} | ${h.source}`)
  }
}
