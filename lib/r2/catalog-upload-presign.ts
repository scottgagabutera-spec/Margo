import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  catalogUploadPutExpirySec,
  r2AccessKeyId,
  r2BucketName,
  r2S3Endpoint,
  r2SecretAccessKey,
} from '@/lib/r2/config'
import { publicCatalogMediaUrl } from '@/lib/r2/catalog-media-url'
import { catalogArtworkObjectKey, catalogAudioObjectKey, slugifySegment } from '@/lib/r2/r2-object-naming'

const CACHE_IMMUTABLE = 'public, max-age=31536000, immutable'

function r2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: r2S3Endpoint(),
    credentials: {
      accessKeyId: r2AccessKeyId(),
      secretAccessKey: r2SecretAccessKey(),
    },
  })
}

const SAFE_EXT = /^[a-z0-9]{1,8}$/

const AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
  'audio/x-aac',
  'audio/flac',
  'audio/mp4',
  'audio/x-m4a',
])

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export interface CatalogUploadPresignInput {
  kind: 'audio' | 'artwork'
  profileId: string
  songId: string
  /** Used for readable path segment; slugified on server. */
  artistLabel: string
  songTitle: string
  extension: string
  contentType: string
  byteLength: number
}

export interface CatalogUploadPresignResult {
  url: string
  headers: Record<string, string>
  key: string
  publicUrl: string
  expiresAt: string
  expiresInSec: number
}

const AUDIO_MAX = 25 * 1024 * 1024
const ARTWORK_MAX = 5 * 1024 * 1024

export function validateCatalogUploadInput(input: CatalogUploadPresignInput): string | null {
  if (!input.artistLabel?.trim() || !input.songTitle?.trim()) {
    return 'artistLabel and songTitle are required'
  }
  if (!SAFE_EXT.test(input.extension)) {
    return 'Invalid file extension'
  }
  if (input.kind === 'audio') {
    if (!AUDIO_TYPES.has(input.contentType)) {
      return 'Audio must use a supported content type'
    }
    if (input.byteLength <= 0 || input.byteLength > AUDIO_MAX) {
      return 'Audio size must be between 1 byte and 25 MB'
    }
  } else {
    if (!IMAGE_TYPES.has(input.contentType)) {
      return 'Poster must be JPEG, PNG, or WebP'
    }
    if (input.byteLength <= 0 || input.byteLength > ARTWORK_MAX) {
      return 'Poster must be between 1 byte and 5 MB'
    }
  }
  return null
}

export function catalogObjectKey(input: CatalogUploadPresignInput): string {
  const artist = input.artistLabel.trim()
  if (input.kind === 'audio') {
    return catalogAudioObjectKey(artist, input.profileId, input.songTitle, input.songId, input.extension)
  }
  return catalogArtworkObjectKey(artist, input.profileId, input.songTitle, input.songId, input.extension)
}

/** ASCII-only metadata values for S3 / R2. */
function metaValue(raw: string): string {
  const s = raw
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
  return s.length > 200 ? s.slice(0, 200) : s
}

export async function presignedPutCatalogObject(
  input: CatalogUploadPresignInput,
): Promise<CatalogUploadPresignResult> {
  const err = validateCatalogUploadInput(input)
  if (err) throw new Error(err)

  const key = catalogObjectKey(input)
  const client = r2Client()
  const expiresInSec = catalogUploadPutExpirySec()
  const metaArtist = metaValue(input.artistLabel)
  const metaTitle = metaValue(input.songTitle)
  const url = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: r2BucketName(),
      Key: key,
      ContentType: input.contentType,
      CacheControl: CACHE_IMMUTABLE,
      Metadata: {
        'margo-title': metaTitle || slugifySegment(input.songTitle),
        'margo-artist': metaArtist || slugifySegment(input.artistLabel),
      },
    }),
    {
      expiresIn: expiresInSec,
      unhoistableHeaders: new Set(['content-length']),
    },
  )
  const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString()
  return {
    url,
    headers: {
      'Content-Type': input.contentType,
      'Cache-Control': CACHE_IMMUTABLE,
      'x-amz-meta-margo-title': metaTitle || slugifySegment(input.songTitle),
      'x-amz-meta-margo-artist': metaArtist || slugifySegment(input.artistLabel),
    },
    key,
    publicUrl: publicCatalogMediaUrl(key),
    expiresAt,
    expiresInSec,
  }
}
