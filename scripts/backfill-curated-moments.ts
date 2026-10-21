/**
 * Backfill song_curated_moments via OpenAI (service role).
 *
 * Usage:
 *   node --experimental-strip-types scripts/backfill-curated-moments.ts --dry-run
 *   node --experimental-strip-types scripts/backfill-curated-moments.ts --limit 50
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 * Set MOMENTS_CURATION_ENABLED=true before running (not dry-run writes).
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { curateSongMoments } from '../lib/moments/curate-song.ts'
import { ESTIMATED_CURATION_USD } from '../lib/moments/curation-config.ts'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitIdx = args.indexOf('--limit')
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1] || '0', 10) : 0

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const { data: songs, error } = await supabase
    .from('songs')
    .select('id, title, artist_display_name')
    .neq('status', 'hidden')
    .order('title')
  if (error) throw error

  const list = (songs || []).slice(0, limit > 0 ? limit : undefined)
  const est = list.length * ESTIMATED_CURATION_USD
  console.log(`Songs: ${list.length} · dryRun=${dryRun} · est cost ≈ $${est.toFixed(2)}`)

  for (const song of list) {
    if (dryRun) {
      console.log(`[dry-run] would curate ${song.title} (${song.id})`)
      continue
    }
    const result = await curateSongMoments({
      supabaseAdmin: supabase,
      songId: song.id,
      writeCache: true,
      force: false,
    })
    console.log(song.title, result.status, result.status === 'failed' ? result.reason : result.moments?.length)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
