/**
 * Step 3: Copy Supabase Storage public URLs (song-audio, song-artwork) to R2 using
 * the same key layout as Studio: Margo/artists/{artist-slug}-{uid8}/audio|artwork/{title-slug}-{songid8}.ext
 *
 * - Does NOT delete or modify Supabase Storage objects.
 * - Idempotent: skips R2 upload if the song field already uses the expected public URL path.
 * - Verifies uploaded size matches downloaded bytes before any DB writes.
 * - Per song: all R2 uploads + HEAD checks succeed first; only then updates `songs` and denormalized
 *   `artwork_url` in `posts`, `post_lines`, `promote_queue` (exact string replace old → new).
 * - `--dry-run` does not connect to R2 (no R2 env vars required). Fetches public URLs to report sizes.
 *
 * Env (see .env.example — use .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY / SUPABASE_SECRET_KEY)
 *   For --apply only: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
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
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'

dotenv.config({ path: '.env.local', quiet: true })

const R2_SLUG_MAX = 40
const NON_ASCII = /[^a-z0-9-]+/g
const DUP_HYPHEN = /-+/g
const ARTISTS_ROOT = 'Margo/artists'
const CACHE_IMMUTABLE = 'public, max-age=31536000, immutable'
const DEFAULT_PUBLIC_HOST = 'audio.trymargo.com'

const DENORM_TABLES = ['posts', 'post_lines', 'promote_queue']

function parseArgs() {
  const argv = process.argv.slice(2)
  const rollbackEq = argv.find((a) => a.startsWith('--rollback='))?.split('=', 2)[1] ?? null
  const rollbackIdx = argv.indexOf('--rollback')
  const rollbackPath =
    rollbackEq ??
    (rollbackIdx >= 0 && argv[rollbackIdx + 1] && !argv[rollbackIdx + 1].startsWith('--')
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

function getS3Singleton() {
  if (!globalThis.__margoMigrateR2S3) {
    globalThis.__margoMigrateR2S3 = r2Client()
  }
  return globalThis.__margoMigrateR2S3
}

/**
 * Download bytes from a public URL (dry-run and apply both fetch for size verification).
 */
async function fetchAssetBytes(url) {
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) {
    throw new Error(`fetch_failed_${res.status}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const u = new URL(url.trim())
  const ext = extFromPath(u.pathname)
  const ct = res.headers.get('content-type')?.split(';')[0]?.trim() || contentTypeForExt(ext || 'bin')
  return { buf, contentType: ct, ext: ext || '' }
}

/**
 * Count rows that would get an artwork_url replace (dry-run).
 */
async function countDenormArtworkRows(client, oldUrl) {
  const out = {}
  for (const table of DENORM_TABLES) {
    const { count, error } = await client
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('artwork_url', oldUrl)
    if (error) throw new Error(`${table}: ${error.message}`)
    out[table] = count ?? 0
  }
  return out
}

/**
 * Replace artwork_url exact match; record one backup entry per row (apply only).
 */
async function replaceDenormArtworkUrl(client, table, oldUrl, newUrl, apply, records) {
  const { data: rows, error: selErr } = await client.from(table).select('id').eq('artwork_url', oldUrl)
  if (selErr) throw new Error(`${table}: ${selErr.message}`)

  if (!apply) {
    return rows?.length ?? 0
  }

  if ((rows || []).length === 0) return 0

  const { error: upErr } = await client.from(table).update({ artwork_url: newUrl }).eq('artwork_url', oldUrl)
  if (upErr) throw new Error(`${table} update: ${upErr.message}`)

  for (const r of rows || []) {
    records.push({
      target: table,
      rowId: r.id,
      column: 'artwork_url',
      previousUrl: oldUrl,
    })
  }
  return rows.length
}

async function deleteR2Keys(s3, bucket, keys) {
  for (const key of keys) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    } catch (e) {
      console.warn('warning: could not delete R2 key after failed unit:', key, e?.message || e)
    }
  }
}

/**
 * Migrate one asset field: returns { skipped, key, newUrl, bytes, previousUrl } or throws.
 */
async function prepareAndUploadField({
  client,
  s3,
  bucket,
  song,
  profileUsername,
  field,
  url,
  apply,
  uploadedKeys,
}) {
  const kind = field === 'audio_url' ? 'audio' : 'artwork'
  if (!isSupabaseStorageUrl(url)) {
    return { skipped: true, reason: 'not_supabase' }
  }

  const u = new URL(url.trim())
  const ext = extFromPath(u.pathname)
  if (!ext) {
    return { skipped: true, reason: 'no_extension' }
  }

  const artistSlug = profileUsername?.trim() || song.artist_display_name?.trim() || 'unknown'
  const key = catalogObjectKey(kind, artistSlug, song.owner_profile_id, song.title, song.id, ext)
  const expectedPublic = publicUrlForKey(key)

  if (objectPathFromPublicUrl(url) === key) {
    return {
      skipped: true,
      reason: 'already_canonical',
      key,
      newUrl: expectedPublic,
      previousUrl: url,
      bytes: null,
    }
  }

  const { buf, contentType } = await fetchAssetBytes(url)

  if (!apply) {
    return {
      skipped: false,
      key,
      newUrl: expectedPublic,
      bytes: buf.length,
      previousUrl: url,
      dryRun: true,
    }
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: contentType,
      CacheControl: CACHE_IMMUTABLE,
    }),
  )
  uploadedKeys.push(key)

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

  return {
    skipped: false,
    key,
    newUrl: expectedPublic,
    bytes: buf.length,
    previousUrl: url,
  }
}

async function processSongUnit({ client, song, profileUsername, apply, args, records }) {
  const fields = ['audio_url', 'artwork_url']
  const uploadedKeys = []
  const s3 = apply ? getS3Singleton() : null
  const bucket =
    process.env.R2_BUCKET_NAME?.trim() || process.env.CLOUDFLARE_R2_BUCKET_NAME?.trim() || ''

  if (apply && !bucket) {
    throw new Error('R2_BUCKET_NAME required for --apply')
  }

  /** @type {Record<string, { newUrl: string, bytes: number|null, previousUrl: string, skippedUpload?: boolean }>} */
  const fieldResults = {}

  for (const field of fields) {
    const url = song[field]
    if (!isSupabaseStorageUrl(url)) continue

    const r = await prepareAndUploadField({
      client,
      s3,
      bucket,
      song,
      profileUsername,
      field,
      url,
      apply,
      uploadedKeys,
    })

    if (r.skipped && r.reason === 'not_supabase') continue
    if (r.skipped && r.reason === 'no_extension') {
      console.log(song.title, field, `SKIP ${r.reason}`)
      continue
    }
    if (r.skipped && r.reason === 'already_canonical') {
      fieldResults[field] = {
        newUrl: r.newUrl,
        bytes: null,
        previousUrl: r.previousUrl,
        objectKey: r.key,
        skippedUpload: true,
      }
      console.log(song.title, field, `SKIP ${r.reason}`)
      continue
    }

    fieldResults[field] = {
      newUrl: r.newUrl,
      bytes: r.bytes,
      previousUrl: r.previousUrl,
      objectKey: r.key,
    }
    console.log(song.title, field, `${r.bytes}B -> ${r.key}`)
  }

  if (!apply) {
    const denormSummary = {}
    const artworkPrev = fieldResults.artwork_url?.previousUrl
    if (artworkPrev && fieldResults.artwork_url && isSupabaseStorageUrl(artworkPrev)) {
      const counts = await countDenormArtworkRows(client, artworkPrev)
      Object.assign(denormSummary, counts)
      console.log(
        song.title,
        'denorm_artwork_url_rows_dry_run',
        JSON.stringify(counts),
      )
    } else {
      console.log(
        song.title,
        'denorm_artwork_url_rows_dry_run',
        JSON.stringify({ posts: 0, post_lines: 0, promote_queue: 0 }),
      )
    }
    return { fieldResults, denormSummary }
  }

  // Apply: DB updates only if we had something to change for this song
  const songPatch = {}
  let touchedFields = []

  for (const field of fields) {
    const fr = fieldResults[field]
    if (!fr) continue
    if (fr.previousUrl === fr.newUrl) continue
    if (fr.skippedUpload) {
      songPatch[field] = fr.newUrl
      touchedFields.push({
        field,
        previousUrl: fr.previousUrl,
        newUrl: fr.newUrl,
        bytes: fr.bytes,
        objectKey: fr.objectKey,
      })
      continue
    }
    songPatch[field] = fr.newUrl
    touchedFields.push({
      field,
      previousUrl: fr.previousUrl,
      newUrl: fr.newUrl,
      bytes: fr.bytes,
      objectKey: fr.objectKey,
    })
  }

  if (Object.keys(songPatch).length === 0) {
    return { fieldResults, denormSummary: {} }
  }

  try {
    songPatch.updated_at = new Date().toISOString()
    const { error: upSongErr } = await client.from('songs').update(songPatch).eq('id', song.id)
    if (upSongErr) throw new Error(upSongErr.message)

    for (const tf of touchedFields) {
      records.push({
        target: 'songs',
        songId: song.id,
        field: tf.field,
        previousUrl: tf.previousUrl,
        newUrl: tf.newUrl,
        key: tf.objectKey,
        bytes: tf.bytes,
      })
    }

    const artworkMap = fieldResults.artwork_url
    if (
      artworkMap &&
      isSupabaseStorageUrl(artworkMap.previousUrl) &&
      artworkMap.previousUrl !== artworkMap.newUrl
    ) {
      for (const table of DENORM_TABLES) {
        const n = await replaceDenormArtworkUrl(
          client,
          table,
          artworkMap.previousUrl,
          artworkMap.newUrl,
          true,
          records,
        )
        console.log(song.title, `denorm ${table} rows updated:`, n)
      }
    }
  } catch (e) {
    await deleteR2Keys(s3, bucket, uploadedKeys)
    throw e
  }

  return { fieldResults, denormSummary: {} }
}

async function rollbackFromFile(path, client) {
  const raw = readFileSync(path, 'utf8')
  const items = JSON.parse(raw)
  if (!Array.isArray(items)) {
    throw new Error('Backup file must be a JSON array')
  }

  /** Restore in reverse file order (new backups interleave songs + denorm per song). */
  for (const row of [...items].reverse()) {
    if (row.target && DENORM_TABLES.includes(row.target) && row.rowId && row.column === 'artwork_url') {
      const { error } = await client
        .from(row.target)
        .update({ [row.column]: row.previousUrl })
        .eq('id', row.rowId)
      if (error) throw new Error(`${row.target} ${row.rowId}: ${error.message}`)
      console.log('restored', row.target, row.rowId, row.column)
    } else if (row.target === 'songs' && row.songId && row.field) {
      const { error } = await client
        .from('songs')
        .update({ [row.field]: row.previousUrl, updated_at: new Date().toISOString() })
        .eq('id', row.songId)
      if (error) throw new Error(error.message)
      console.log('restored songs', row.songId, row.field)
    } else if (row.songId && row.field && !row.target) {
      /** Legacy backup entries from older script versions (songs only). */
      const { error } = await client
        .from('songs')
        .update({ [row.field]: row.previousUrl, updated_at: new Date().toISOString() })
        .eq('id', row.songId)
      if (error) throw new Error(error.message)
      console.log('restored songs', row.songId, row.field)
    } else {
      throw new Error(`Unrecognized backup entry: ${JSON.stringify(row)}`)
    }
  }

  console.log('Rollback complete:', items.length, 'entries')
}

async function main() {
  const args = parseArgs()
  if (args.rollback) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.SUPABASE_SERVICE_KEY?.trim() ||
      process.env.SUPABASE_SECRET_KEY?.trim()
    if (!url || !key) throw new Error('Supabase URL + service role key required')
    const client = createClient(url, key, { auth: { persistSession: false } })
    await rollbackFromFile(args.rollback, client)
    return
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim()
  if (!url || !serviceKey) throw new Error('NEXT_PUBLIC_SUPABASE_URL and service role key required')

  if (args.apply) {
    const bucket = process.env.R2_BUCKET_NAME?.trim() || process.env.CLOUDFLARE_R2_BUCKET_NAME?.trim()
    if (!bucket) throw new Error('R2_BUCKET_NAME required for --apply')
    getS3Singleton()
  }

  const client = createClient(url, serviceKey, { auth: { persistSession: false } })

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

  for (const song of limited) {
    const uname = usernameById.get(song.owner_profile_id) || null
    try {
      await processSongUnit({
        client,
        song,
        profileUsername: uname,
        apply: args.apply,
        args,
        records,
      })
    } catch (e) {
      console.error('Song unit failed (no DB changes for this song if error was after partial R2):', song.title, e?.message || e)
      throw e
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
