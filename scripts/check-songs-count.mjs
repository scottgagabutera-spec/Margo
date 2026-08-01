// One-off check: confirms whether migrate-songs-to-supabase.mjs was actually
// run against production, or if the tables are still empty.
// Run with: node scripts/check-songs-count.mjs
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// dotenv/config loads .env by default — Next.js projects use .env.local,
// which needs to be pointed at explicitly for a plain node script.
dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or a service role key in .env.local')
  console.error('Found url:', !!url, '| found serviceKey:', !!serviceKey)
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

async function main() {
  const { count: songCount, error: songErr } = await supabase
    .from('songs')
    .select('*', { count: 'exact', head: true })

  const { count: lineCount, error: lineErr } = await supabase
    .from('lyric_lines')
    .select('*', { count: 'exact', head: true })

  const { count: vibeCount, error: vibeErr } = await supabase
    .from('lyric_line_vibes')
    .select('*', { count: 'exact', head: true })

  if (songErr) console.error('songs error:', songErr.message)
  if (lineErr) console.error('lyric_lines error:', lineErr.message)
  if (vibeErr) console.error('lyric_line_vibes error:', vibeErr.message)

  console.log('--- Supabase production row counts ---')
  console.log('songs:', songCount)
  console.log('lyric_lines:', lineCount)
  console.log('lyric_line_vibes:', vibeCount)

  if (songCount > 0) {
    const { data: sample } = await supabase
      .from('songs')
      .select('id, title, artist_display_name, status')
      .limit(5)
    console.log('\nSample songs:')
    console.table(sample)
  }
}

main()