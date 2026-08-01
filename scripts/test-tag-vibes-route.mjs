// One-off test: verifies the rewritten /api/tag-vibes route correctly writes
// lyric_lines + lyric_line_vibes to Supabase, using a throwaway test song so
// none of the 10 real live songs are touched.
//
// IMPORTANT: run `npm run dev` in another terminal first — this hits your
// local Next.js server at http://localhost:3000, not production directly.
//
// Run with: node scripts/test-tag-vibes-route.mjs
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(url, serviceKey)

const FAKE_SRT = `1
00:00:00,000 --> 00:00:03,000
This is a test line about hope

2
00:00:03,000 --> 00:00:06,000
Hmm

3
00:00:06,000 --> 00:00:09,000
Feeling so much love tonight`

async function main() {
  console.log('1. Looking up a real profile to own the test song...')
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('is_artist', true)
    .limit(1)
    .single()

  if (profileErr || !profile) {
    console.error('Could not find an artist profile to attach the test song to:', profileErr?.message)
    process.exit(1)
  }
  console.log('   Using profile:', profile.username, profile.id)

  console.log('2. Creating throwaway test song (status=draft, invisible on /music)...')
  const { data: testSong, error: insertErr } = await supabase
    .from('songs')
    .insert({
      owner_profile_id: profile.id,
      title: '__TEST_SONG_DELETE_ME__',
      artist_display_name: 'Test Artist',
      status: 'draft',
    })
    .select('id')
    .single()

  if (insertErr || !testSong) {
    console.error('Failed to create test song:', insertErr?.message)
    process.exit(1)
  }
  const songId = testSong.id
  console.log('   Test song created:', songId)

  console.log('3. Calling /api/tag-vibes against the test song...')
  const res = await fetch('http://localhost:3000/api/tag-vibes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      srt: FAKE_SRT,
      songTitle: '__TEST_SONG_DELETE_ME__',
      artist: 'Test Artist',
      songId,
    }),
  })
  const result = await res.json()
  console.log('   Route response:', result)

  if (!res.ok) {
    console.error('   Route returned an error — stopping before cleanup so you can inspect.')
    return
  }

  console.log('4. Verifying rows actually landed in Supabase...')
  const { data: lines } = await supabase
    .from('lyric_lines')
    .select('id, line_index, text, start_sec, end_sec')
    .eq('song_id', songId)
    .order('line_index')
  console.log('   lyric_lines:', lines)

  const lineIds = (lines || []).map(l => l.id)
  const { data: vibes } = await supabase
    .from('lyric_line_vibes')
    .select('line_id, vibe')
    .in('line_id', lineIds)
  console.log('   lyric_line_vibes:', vibes)

  console.log('5. Cleaning up — deleting test song (cascades lines + vibes automatically)...')
  const { error: deleteErr } = await supabase.from('songs').delete().eq('id', songId)
  if (deleteErr) {
    console.error('   Cleanup failed — you may need to manually delete song id:', songId, deleteErr.message)
  } else {
    console.log('   Cleaned up successfully. No test data left behind.')
  }
}

main()
