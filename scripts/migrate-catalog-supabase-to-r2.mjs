/**
 * Step 3: Copy Supabase Storage public URLs (song-audio, song-artwork) to R2 using
 * the same key layout as Studio: Margo/artists/{artist-slug}-{uid8}/audio|artwork/{title-slug}-{songid8}.ext
 *
 * - Does NOT delete or modify Supabase Storage objects.
 * - Idempotent: skips if songs row already points at audio.trymargo.com with the expected key path.
 * - Verifies uploaded size matches downloaded bytes before updating DB.
 *
 * Env (see .env.example pattern — use .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY / SUPABASE_SECRET_KEY)
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 *   NEXT_PUBLIC_MARGO_MEDIA_PUBLIC_HOST (optional, default audio.trymargo.com)
 *
 * Usage:
 *   node scripts/migrate-catalog-supabase-to-r2.mjs --dry-run
 *   node scripts/migrate-catalog-supabase-to-r2.mjs --apply --backup=/tmp/margo-catalog-migrate.json
 *   node scripts/migrate-catalog-supabase-to-r2.mjs --rollback=/tmp/margo-catalog-migrate.json
 */
import dotenv from 'dotenv'
import { createWriteStream, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

dotenv.config({ path: '.env.local', quiet: true })

const R2_SLUG_MAX = 40
const NON_ASCII = /[^a-z0-9-]+/g
const DUP_HYPHEN = /-+/g
const ARTISTS_ROOT = 'Margo/artists'
const CACHE_IMMUTABLE = 'public, max-age=31536000, immutable'
const DEFAULT_PUBLIC_HOST = 'audio.trymargo.com'

function parseArgs() {
  const argv = process.argv.slice(2)
  const rollbackEq = argv.find((a) => a.startsWith('--rollback='))?.split('=', 2)[1] ?? null
  const rollbackIdx = argv.indexOf('--rollback')
  const rollbackPath =
    rollbackEq ?? (rollbackIdx >= 0 && argv[rollbackIdx + 1] && !argv[rollbackIdx + 1].startsWith('--')
      ? argv[rollbackIdx + 1]
      : null)
  return {
    dryRun:
      argv.includes('--dry-run') ||
      (!argv.includes('--apply') && !argv.some((a) => a.startsWith('--rollback'))),
    apply: argv.includes('--apply'),
    rollback: rollbackPath,
    backup:
      argv.find((a) => a.startsWith('--backup='))?.split('=', 2)[1] ??
      '.migrate-catalog-to-r2.backup.json',
    limit: (() => {
      const x = argv.find((a) => a.startsWith('--limit='))?.split('=', 2)[1]
      return x ? Math.max(1, parseInt(x, 10) || 0) : null
    })(),
  }
}

function shortId8FromUuid(uuid) {
  return uuid.replace(/-/g, '').toLowerCase().slice(0, 8)
}

function slugifySegment(raw) {
  const s = String(raw ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
  let out = s.replace(NON_ASCII, '-').replace(DUP_HYPHEN, '-').replace(/^-|-$/g, '')
  if (!out) out = 'unknown'
  return out.length > R2_SLUG_MAX ? out.slice(0, R2_SLUG_MAX) : out
}

function artistRootPrefix(artistSlug, profileId) {
  const folder = `${slugifySegment(artistSlug)}-${shortId8FromUuid(profileId)}`
  return `${ARTISTS_ROOT}/${folder}`
}

function catalogObjectKey(kind, artistSlug, profileId, songTitle, songId, extension) {
  const base = `${slugifySegment(songTitle)}-${shortId8FromUuid(songId)}.${extension}`
  const sub = kind === 'audio' ? 'audio' : 'artwork'
  return `${artistRootPrefix(artistSlug, profileId)}/${sub}/${base}`
}

function publicUrlForKey(objectKey) {
  const host =
    process.env.NEXT_PUBLIC_MARGO_MEDIA_PUBLIC_HOST?.trim() ||
    process.env.MARGO_MEDIA_PUBLIC_HOST?.trim() ||
    DEFAULT_PUBLIC_HOST
  return `https://${host.replace(/^\/+|\/+$/g, '')}/${objectKey.replace(/^\/+/, '')}`
}

function objectPathFromPublicUrl(url) {
  try {
    return new URL(String(url).trim()).pathname.replace(/^\/+/, '')
  } catch {
    return ''
  }
}

function isSupabaseStorageUrl(url) {
  if (!url?.trim()) return false
  try {
    const u = new URL(url.trim())
    return u.hostname.includes('supabase.co') && u.pathname.includes('/storage/v1/object/public/')
  } catch {
    return false
  }
}

function extFromPath(pathname) {
  const base = pathname.split('/').pop() || ''
  const i = base.lastIndexOf('.')
  if (i <= 0) return ''
  return base.slice(i + 1).toLowerCase()
}

function contentTypeForExt(ext) {
  const e = ext.toLowerCase()
  if (e === 'mp3' || e === 'mpeg') return 'audio/mpeg'
  if (e === 'wav') return 'audio/wav'
  if (e === 'm4a' || e === 'mp4') return 'audio/mp4'
  if (e === 'aac') return 'audio/aac'
  if (e === 'flac') return 'audio/flac'
  if (e === 'png') return 'image/png'
  if (e === 'webp') return 'image/webp'
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg'
  return 'application/octet-stream'
}

function r2Client() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() || process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
  const accessKeyId =
    process.env.R2_ACCESS_KEY_ID?.trim() || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim()
  const secretAccessKey =
    process.env.R2_SECRET_ACCESS_KEY?.trim() || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim()
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY required')
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

async function migrateField({
  client,
  s3,
  bucket,
  song,
  profileUsername,
  field,
  url,
  apply,
  records,
}) {
  const kind = field === 'audio_url' ? 'audio' : 'artwork'
  if (!isSupabaseStorageUrl(url)) return { skipped: true, reason: 'not_supabase' }

  const u = new URL(url.trim())
  const ext = extFromPath(u.pathname)
  if (!ext) return { skipped: true, reason: 'no_extension' }

  const artistSlug = profileUsername?.trim() || song.artist_display_name?.trim() || 'unknown'
  const key = catalogObjectKey(kind, artistSlug, song.owner_profile_id, song.title, song.id, ext)
  const expectedPublic = publicUrlForKey(key)

  if (objectPathFromPublicUrl(url) === key) {
    return { skipped: true, reason: 'already_canonical' }
  }

  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) {
    return { skipped: true, reason: `fetch_failed_${res.status}` }
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const ct = res.headers.get('content-type')?.split(';')[0]?.trim() || contentTypeForExt(ext)

  if (!apply) {
    return { skipped: false, key, bytes: buf.length, newUrl: expectedPublic, dryRun: true }
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: ct,
      CacheControl: CACHE_IMMUTABLE,
    }),
  )
  const head = await s3.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  )
  const size = Number(head.ContentLength)
  if (size !== buf.length) {
    throw new Error(`Size mismatch for ${key}: head=${size} bytes=${buf.length}`)
  }

  const { error: upErr } = await client
    .from('songs')
    .update({ [field]: expectedPublic, updated_at: new Date().toISOString() })
    .eq('id', song.id)
  if (upErr) throw new Error(upErr.message)

  records.push({
    songId: song.id,
    field,
    previousUrl: url,
    newUrl: expectedPublic,
    key,
    bytes: buf.length,
  })

  return { skipped: false, key, bytes: buf.length, newUrl: expectedPublic }
}

async function main() {
  const args = parseArgs()
  if (args.rollback) {
    const raw = readFileSync(args.rollback, 'utf8')
    const items = JSON.parse(raw)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.SUPABASE_SERVICE_KEY?.trim() ||
      process.env.SUPABASE_SECRET_KEY?.trim()
    if (!url || !key) throw new Error('Supabase URL + service role key required')
    const client = createClient(url, key, { auth: { persistSession: false } })
    for (const row of items) {
      const { error } = await client
        .from('songs')
        .update({ [row.field]: row.previousUrl, updated_at: new Date().toISOString() })
        .eq('id', row.songId)
      if (error) throw new Error(error.message)
      console.log('restored', row.songId, row.field)
    }
    console.log('Rollback complete:', items.length, 'rows')
    return
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim()
  const bucket = process.env.R2_BUCKET_NAME?.trim() || process.env.CLOUDFLARE_R2_BUCKET_NAME?.trim()
  if (!url || !serviceKey) throw new Error('NEXT_PUBLIC_SUPABASE_URL and service role key required')
  if (!bucket) throw new Error('R2_BUCKET_NAME required')

  const client = createClient(url, serviceKey, { auth: { persistSession: false } })
  const s3 = r2Client()

  const { data: songs, error } = await client
    .from('songs')
    .select('id, title, artist_display_name, owner_profile_id, audio_url, artwork_url')
  if (error) throw new Error(error.message)

  const profileIds = [...new Set((songs || []).map((s) => s.owner_profile_id).filter(Boolean))]
  const { data: profiles } = await client.from('profiles').select('id, username').in('id', profileIds)
  const usernameById = new Map((profiles || []).map((p) => [p.id, p.username]))

  const targets = (songs || []).filter(
    (s) => isSupabaseStorageUrl(s.audio_url) || isSupabaseStorageUrl(s.artwork_url),
  )
  const limited = args.limit ? targets.slice(0, args.limit) : targets

  console.log(
    JSON.stringify(
      {
        mode: args.apply ? 'apply' : 'dry-run',
        candidateSongs: limited.length,
        backupFile: args.apply ? args.backup : null,
      },
      null,
      2,
    ),
  )

  const records = []
  let processed = 0
  for (const song of limited) {
    const uname = usernameById.get(song.owner_profile_id) || null
    for (const field of ['audio_url', 'artwork_url']) {
      const u = song[field]
      if (!isSupabaseStorageUrl(u)) continue
      processed += 1
      const r = await migrateField({
        client,
        s3,
        bucket,
        song,
        profileUsername: uname,
        field,
        url: u,
        apply: args.apply,
        records,
      })
      console.log(song.title, field, r.skipped ? `SKIP ${r.reason}` : `${r.bytes}B -> ${r.key}`)
    }
  }

  if (args.apply && records.length > 0) {
    const out = JSON.stringify(records, null, 2)
    await new Promise((resolve, reject) => {
      const ws = createWriteStream(args.backup)
      ws.on('finish', resolve)
      ws.on('error', reject)
      ws.write(out)
      ws.end()
    })
    console.log('Wrote backup for rollback:', args.backup, 'entries:', records.length)
  }

  if (!args.apply) {
    console.log('Dry-run only. Pass --apply --backup=/path/to/file.json to execute.')
  }
}

main().catch((e) => {
  console.error(e?.message || e)
  process.exit(1)
})
