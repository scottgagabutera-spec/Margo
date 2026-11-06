/**
 * Read-only: classify each Firebase RTDB `songs` entry by where audio + artwork URLs are hosted.
 *
 * Live RTDB: uses the same Firebase Admin env vars as the app
 * (see app/api/admin/featured/import-rtdb/route.ts):
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_DATABASE_URL
 *
 * Or pass a JSON export (object keyed by Firebase song id) — no Firebase packages required:
 *   node scripts/audit-song-hosts.mjs ./path/to-firebase-songs-export.json
 *
 * Loads .env.local when present (same pattern as scripts/check-songs-count.mjs).
 * Does not print secrets — only whether required env vars are set (when using live RTDB).
 *
 * Usage:
 *   node scripts/audit-song-hosts.mjs
 *   node scripts/audit-song-hosts.mjs ./margo-rtdb-songs-export.json
 */
import dotenv from 'dotenv'
import { readFileSync } from 'node:fs'

// Load secrets from .env.local without debug banner (dotenv 17+ tips)
dotenv.config({ path: '.env.local', quiet: true })

const TRY_MARGO_AUDIO_HOST = 'audio.trymargo.com'

function envSummary() {
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

function runAudit(songsVal, sourceLabel) {
  if (typeof songsVal !== 'object' || songsVal === null) {
    throw new Error('Songs data must be a non-null object')
  }

  const entries = Object.entries(songsVal)
  const audioCounts = Object.create(null)
  const artworkCounts = Object.create(null)
  /** @type {{ title: string, firebaseId: string, field: string }[]} */
  const supabaseTitles = []

  for (const [firebaseId, song] of entries) {
    if (!song || typeof song !== 'object') continue
    const title = typeof song.title === 'string' ? song.title : '(no title)'
    const audioRaw = song.audioUrl ?? song.audio_url
    const artworkRaw = song.artwork ?? song.artworkUrl ?? song.artwork_url

    const audio = classifyUrl(audioRaw)
    const artwork = classifyUrl(artworkRaw)

    accumulate(audioCounts, audio.bucket)
    accumulate(artworkCounts, artwork.bucket)

    if (audio.bucket === 'supabase') {
      supabaseTitles.push({ title, firebaseId, field: 'audio' })
    }
    if (artwork.bucket === 'supabase') {
      supabaseTitles.push({ title, firebaseId, field: 'artwork' })
    }
  }

  console.log(`Source: ${sourceLabel}`)
  console.log('\n── Songs in source:', entries.length, '──')
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
      console.log(`  - ${row.title}  [${row.field}]  (firebase id: ${row.firebaseId})`)
    }
  } else {
    console.log('\nNo Supabase storage URLs found on song audio/artwork fields.')
  }
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
      'Missing Firebase env: need FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_DATABASE_URL',
    )
    console.error('Env present:', JSON.stringify(envSummary()))
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
    console.log('Env present (boolean):', JSON.stringify(envSummary()))
    process.exit(0)
  }
  return snap.val()
}

async function main() {
  const exportPath = process.argv[2]

  if (exportPath) {
    const raw = readFileSync(exportPath, 'utf8')
    const data = JSON.parse(raw)
    runAudit(data, `JSON file ${exportPath}`)
    return
  }

  const songsVal = await loadFromRtdb()
  runAudit(songsVal, 'Firebase Realtime Database songs/')
  console.log('\nEnv present (boolean, no secrets):', JSON.stringify(envSummary()))
}

main().catch((e) => {
  console.error(e?.message || e)
  process.exit(1)
})
