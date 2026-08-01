// Utility: delete a song by id (used to clean up leftover test songs).
// Run with: node scripts/delete-song.mjs <songId>
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const songId = process.argv[2]
if (!songId) {
  console.error('Usage: node scripts/delete-song.mjs <songId>')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { error } = await supabase.from('songs').delete().eq('id', songId)
console.log(error ? `Failed: ${error.message}` : `Deleted song ${songId}`)
