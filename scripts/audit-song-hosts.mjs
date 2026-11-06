/**
 * Read-only: classify each song's audio_url and artwork_url by host (audio.trymargo.com vs Supabase Storage vs other).
 *
 * The running app reads catalog songs from Supabase Postgres `public.songs` (e.g. hooks/useSong.ts, app/studio/page.tsx),
 * not from Firebase RTDB. Default mode queries Supabase only.
 *
 * Env (from .env.local): NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY / SUPABASE_SECRET_KEY).
 * Same pattern as scripts/check-songs-count.mjs. Does not print secrets.
 *
 * Usage:
 *   node scripts/audit-song-hosts.mjs
 *   node scripts/audit-song-hosts.mjs ./export.json
 *   node scripts/audit-song-hosts.mjs --firebase
 *
 * JSON file: array of rows or object keyed by id, with title + audio_url/audioUrl + artwork_url/artwork.
 * --firebase: optional; uses Firebase Admin + FIREBASE_* (same as app/api/admin/featured/import-rtdb/route.ts) to read RTDB songs/.
 */
import dotenv from 'dotenv'
import { readFileSync } from 'node:fs'

dotenv.config({ path: '.env.local', quiet: true })

const TRY_MARGO_AUDIO_HOST = 'audio.trymargo.com'

function envSummarySupabase() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
    serviceRoleKey: !!(
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.SUPABASE_SERVICE_KEY?.trim() ||
      process.env.SUPABASE_SECRET_KEY?.trim()
    ),
  }
}

function envSummaryFirebase() {
  return {
    FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID?.trim(),
    FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL?.trim(),
    FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY?.trim(),
    FIREBASE_DATABASE_URL: !!process.env.FIREBASE_DATABASE_URL?.trim(),
  }
}

function classifyUrl(raw) {
  if (raw == null || String(raw).trim() === '') {
    return { bucket: 'empty', host: null }
  }
  let u
  try {
    u = new URL(String(raw).trim())
  } catch {
    return { bucket: 'other', host: 'invalid-url' }
  }
  const host = u.hostname.toLowerCase()

  if (host === TRY_MARGO_AUDIO_HOST || host.endsWith(`.${TRY_MARGO_AUDIO_HOST}`)) {
    return { bucket: 'audio.trymargo.com', host }
  }
  if (host.includes('supabase.co')) {
    return { bucket: 'supabase', host }
  }
  return { bucket: 'other', host }
}

function accumulate(counts, key) {
  counts[key] = (counts[key] || 0) + 1
}

/** Normalize one record (Supabase row or Firebase song object). */
function getFields(rec, fallbackId) {
  const title = typeof rec.title === 'string' ? rec.title : '(no title)'
  const audioRaw = rec.audio_url ?? rec.audioUrl
  const artworkRaw = rec.artwork_url ?? rec.artworkUrl ?? rec.artwork
  const id = rec.id ?? rec.firebase_id ?? fallbackId ?? '?'
  return { id: String(id), title, audioRaw, artworkRaw }
}

function runAudit(records, sourceLabel, idLabel) {
  const audioCounts = Object.create(null)
  const artworkCounts = Object.create(null)
  /** @type {{ title: string, id: string, field: string }[]} */
  const supabaseTitles = []

  for (const rec of records) {
    if (!rec || typeof rec !== 'object') continue
    const { id, title, audioRaw, artworkRaw } = getFields(rec)

    const audio = classifyUrl(audioRaw)
    const artwork = classifyUrl(artworkRaw)

    accumulate(audioCounts, audio.bucket)
    accumulate(artworkCounts, artwork.bucket)

    if (audio.bucket === 'supabase') {
      supabaseTitles.push({ title, id, field: 'audio' })
    }
    if (artwork.bucket === 'supabase') {
      supabaseTitles.push({ title, id, field: 'artwork' })
    }
  }

  console.log(`Source: ${sourceLabel}`)
  console.log(`Row id field: ${idLabel}`)
  console.log('\n── Songs in source:', records.length, '──')
  console.log('\nAudio URL host buckets:')
  for (const [k, v] of Object.entries(audioCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`)
  }
  console.log('\nArtwork URL host buckets:')
  for (const [k, v] of Object.entries(artworkCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`)
  }

  if (supabaseTitles.length > 0) {
    console.log('\nTitles with at least one Supabase-hosted URL (audio or artwork):')
    for (const row of supabaseTitles) {
      console.log(`  - ${row.title}  [${row.field}]  (${idLabel}: ${row.id})`)
    }
  } else {
    console.log('\nNo Supabase storage URLs found on song audio/artwork fields.')
  }
}

function normalizeJsonToRecords(data) {
  if (Array.isArray(data)) {
    return data
  }
  if (typeof data === 'object' && data !== null) {
    return Object.entries(data).map(([key, v]) =>
      v && typeof v === 'object' ? { ...v, id: v.id ?? key } : null,
    ).filter(Boolean)
  }
  throw new Error('JSON must be an array or object of songs')
}

async function loadFromSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim()
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or a service role key (.env.local)')
    console.error('Env present:', JSON.stringify(envSummarySupabase()))
    process.exit(1)
  }
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await supabase.from('songs').select('id, title, audio_url, artwork_url')
  if (error) throw new Error(error.message)
  return data || []
}

async function loadFromRtdb() {
  const { getApps, initializeApp, cert } = await import('firebase-admin/app')
  const { getDatabase } = await import('firebase-admin/database')

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim()
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim()
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const databaseURL = process.env.FIREBASE_DATABASE_URL?.trim()
  if (!projectId || !clientEmail || !privateKey || !databaseURL) {
    console.error(
      'Missing Firebase env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_DATABASE_URL',
    )
    console.error('Env present:', JSON.stringify(envSummaryFirebase()))
    process.exit(1)
  }

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        databaseURL,
      })

  const snap = await getDatabase(app).ref('songs').get()
  if (!snap.exists()) {
    console.log('No data at RTDB path songs/ (snapshot empty).')
    console.log('Env present (boolean):', JSON.stringify(envSummaryFirebase()))
    process.exit(0)
  }
  const val = snap.val()
  return normalizeJsonToRecords(val)
}

async function main() {
  const arg = process.argv[2]

  if (arg === '--firebase') {
    const records = await loadFromRtdb()
    runAudit(records, 'Firebase Realtime Database songs/', 'firebase id / key')
    console.log('\nEnv present (boolean, no secrets):', JSON.stringify(envSummaryFirebase()))
    return
  }

  if (arg) {
    const raw = readFileSync(arg, 'utf8')
    const data = JSON.parse(raw)
    const records = normalizeJsonToRecords(data)
    runAudit(records, `JSON file ${arg}`, 'id')
    return
  }

  const records = await loadFromSupabase()
  runAudit(records, 'Supabase public.songs', 'id')
  console.log('\nEnv present (boolean, no secrets):', JSON.stringify(envSummarySupabase()))
}

main().catch((e) => {
  console.error(e?.message || e)
  process.exit(1)
})
