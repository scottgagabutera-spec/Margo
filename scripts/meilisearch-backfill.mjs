// One-shot backfill: import all Margo searchable content into Meilisearch.
// Run: node scripts/meilisearch-backfill.mjs
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const MEILI_HOST = (process.env.MEILISEARCH_HOST || '').replace(/\/$/, '')
const MEILI_KEY = process.env.MEILISEARCH_ADMIN_KEY || process.env.MEILISEARCH_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY

if (!MEILI_HOST || !MEILI_KEY) {
  console.error('Missing MEILISEARCH_HOST and MEILISEARCH_ADMIN_KEY in .env.local')
  process.exit(1)
}
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase URL or service role key in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const INDEX = 'margo'

async function meili(path, init = {}) {
  const headers = { Authorization: `Bearer ${MEILI_KEY}`, 'Content-Type': 'application/json' }
  const res = await fetch(`${MEILI_HOST}${path}`, { ...init, headers: { ...headers, ...init.headers } })
  return res
}

function profileToUserDoc(row) {
  if (!row.username) return null
  return {
    id: `user:${row.id}`,
    type: 'user',
    title: row.display_name || row.username,
    subtitle: `@${row.username}`,
    username: row.username,
    profileId: row.id,
    artworkUrl: row.avatar_url || null,
    createdAt: Date.now(),
  }
}

function profileToArtistDoc(row) {
  if (!row.is_artist || !row.username) return null
  return {
    id: `artist:${row.id}`,
    type: 'artist',
    title: row.display_name || row.username,
    subtitle: `@${row.username}`,
    username: row.username,
    profileId: row.id,
    artworkUrl: row.avatar_url || null,
    createdAt: Date.now(),
  }
}

function postToLyricDoc(row) {
  const text = (row.text || '').trim()
  if (!text) return null
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  const username = profile?.username || row.legacy_author_label || null
  return {
    id: `post:${row.id}`,
    type: 'lyric',
    text,
    title: text.slice(0, 120),
    subtitle: [row.song_title, row.artist_name].filter(Boolean).join(' · ') || undefined,
    emotion: row.emotion || undefined,
    username: username || undefined,
    songId: row.song_id || undefined,
    postId: row.id,
    artworkUrl: row.artwork_url || null,
    resonateCount: row.resonate_count ?? 0,
    createdAt: row.created_at ? Date.parse(row.created_at) : Date.now(),
  }
}

function lyricLineToCatalogDoc(row) {
  const text = (row.text || '').trim()
  if (!text) return null
  const song = Array.isArray(row.songs) ? row.songs[0] : row.songs
  const stats = song?.song_stats
  const playsRow = Array.isArray(stats) ? stats[0] : stats
  return {
    id: `line:${row.song_id}:${row.line_index}`,
    type: 'catalog_line',
    text,
    title: text.slice(0, 120),
    subtitle: [song?.title, song?.artist_display_name].filter(Boolean).join(' · ') || undefined,
    songId: row.song_id,
    artworkUrl: song?.artwork_url || null,
    plays: playsRow?.plays ?? 0,
    createdAt: Date.now(),
  }
}

async function ensureIndex() {
  const list = await meili('/indexes')
  const data = await list.json()
  const exists = (data.results || []).some(i => i.uid === INDEX)
  if (!exists) {
    const created = await meili('/indexes', {
      method: 'POST',
      body: JSON.stringify({ uid: INDEX, primaryKey: 'id' }),
    })
    if (!created.ok && created.status !== 409) {
      throw new Error(`create index failed: ${created.status}`)
    }
  }
  await meili(`/indexes/${INDEX}/settings`, {
    method: 'PATCH',
    body: JSON.stringify({
      searchableAttributes: ['text', 'title', 'subtitle', 'username', 'emotion'],
      filterableAttributes: ['type'],
      sortableAttributes: ['resonateCount', 'plays', 'createdAt'],
      rankingRules: [
        'words', 'typo', 'proximity', 'attribute', 'sort', 'exactness',
        'resonateCount:desc', 'plays:desc', 'createdAt:desc',
      ],
    }),
  })
}

async function main() {
  const docs = []

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, is_artist')
  for (const row of profiles || []) {
    const user = profileToUserDoc(row)
    if (user) docs.push(user)
    const artist = profileToArtistDoc(row)
    if (artist) docs.push(artist)
  }

  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id, text, emotion, song_title, artist_name, artwork_url, song_id,
      legacy_author_label, created_at, status,
      profiles:author_profile_id ( username, display_name ),
      post_stats ( resonate_count )
    `)
    .eq('status', 'active')
    .is('parent_post_id', null)
  for (const row of posts || []) {
    const stats = Array.isArray(row.post_stats) ? row.post_stats[0] : row.post_stats
    const doc = postToLyricDoc({ ...row, resonate_count: stats?.resonate_count ?? 0 })
    if (doc) docs.push(doc)
  }

  const { data: lines } = await supabase
    .from('lyric_lines')
    .select(`
      song_id, line_index, text,
      songs!inner ( title, artist_display_name, artwork_url, status, song_stats ( plays ) )
    `)
    .eq('songs.status', 'live')
  for (const row of lines || []) {
    const doc = lyricLineToCatalogDoc(row)
    if (doc) docs.push(doc)
  }

  console.log(`Prepared ${docs.length} documents`)
  await ensureIndex()

  const BATCH = 500
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH)
    const res = await meili(`/indexes/${INDEX}/documents`, {
      method: 'POST',
      body: JSON.stringify(batch),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`upsert batch ${i} failed: ${res.status} ${body}`)
    }
    console.log(`Upserted ${Math.min(i + BATCH, docs.length)} / ${docs.length}`)
  }

  console.log('Backfill complete.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
