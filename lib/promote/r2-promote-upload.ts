import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  promoteStagingPutExpirySec,
  r2AccessKeyId,
  r2BucketName,
  r2PublicMediaHost,
  r2S3Endpoint,
  r2SecretAccessKey,
  r2SignedUrlExpirySec,
} from '@/lib/r2/config'
import {
  promoteStagingObjectKey,
  type PromoteStagingKeyInput,
} from '@/lib/promote/promote-staging-path'
import {
  legacyPromoteFinalKey,
  promoteFinalVideoObjectKey,
  slugifySegment,
} from '@/lib/r2/r2-object-naming'

/** Legacy prefix only — final videos now live under Margo/artists/.../promote/ */
export const PROMOTE_OBJECT_PREFIX = 'Margo/promote' as const

const ARTISTS_PREFIX = 'Margo/artists/' as const

export function promoteVideoObjectKey(
  artistSlug: string,
  profileId: string,
  songTitle: string,
  queueId: string,
): string {
  return promoteFinalVideoObjectKey(artistSlug, profileId, songTitle, queueId)
}

export { promoteStagingObjectKey } from '@/lib/promote/promote-staging-path'

function metaValue(raw: string): string {
  const s = raw
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
  return s.length > 200 ? s.slice(0, 200) : s
}

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

/** Copy staged MP4 to the public promote key (same bytes, no re-upload from app server disk). */
export async function copyPromoteStagingToFinal(
  stagingKey: string,
  artistSlug: string,
  profileId: string,
  songTitle: string,
  queueId: string,
): Promise<{ objectKey: string; publicUrl: string }> {
  const finalKey = promoteVideoObjectKey(artistSlug, profileId, songTitle, queueId)
  const bucket = r2BucketName()
  const client = r2Client()
  const encodedKey = stagingKey
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
  await client.send(new CopyObjectCommand({
    Bucket: bucket,
    CopySource: `${bucket}/${encodedKey}`,
    Key: finalKey,
    ContentType: 'video/mp4',
    CacheControl: 'public, max-age=86400',
    MetadataDirective: 'REPLACE',
  }))
  return { objectKey: finalKey, publicUrl: publicPromoteVideoUrl(finalKey) }
}

/** Multipart fallback upload — same layout as copy destination. */
export async function uploadPromoteVideo(
  artistSlug: string,
  profileId: string,
  songTitle: string,
  queueId: string,
  videoBytes: Buffer,
): Promise<{ objectKey: string; byteSize: number; publicUrl: string }> {
  const objectKey = promoteVideoObjectKey(artistSlug, profileId, songTitle, queueId)
  const client = r2Client()
  await client.send(new PutObjectCommand({
    Bucket: r2BucketName(),
    Key: objectKey,
    Body: videoBytes,
    ContentType: 'video/mp4',
    CacheControl: 'public, max-age=86400',
  }))
  return {
    objectKey,
    byteSize: videoBytes.length,
    publicUrl: publicPromoteVideoUrl(objectKey),
  }
}

export function publicPromoteVideoUrl(objectKey: string): string {
  const normalized = objectKey.replace(/^\/+/, '')
  return `https://${r2PublicMediaHost()}/${normalized}`
}

/** Resolve object key from a public promote URL (audio.trymargo.com). */
export function parsePromoteVideoObjectKeyFromUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  try {
    const key = new URL(url.trim()).pathname.replace(/^\/+/, '')
    if (key.startsWith(`${PROMOTE_OBJECT_PREFIX}/`)) return key
    if (key.startsWith(ARTISTS_PREFIX) && key.includes('/promote/') && !key.includes('/promote/staging/')) {
      return key
    }
    return null
  } catch {
    return null
  }
}

export function resolvePromoteObjectKey(
  profileId: string,
  queueId: string,
  renderedVideoUrl: string | null | undefined,
): string {
  return parsePromoteVideoObjectKeyFromUrl(renderedVideoUrl)
    ?? legacyPromoteFinalKey(profileId, queueId)
}

export async function deletePromoteVideo(objectKey: string): Promise<void> {
  const client = r2Client()
  await client.send(new DeleteObjectCommand({
    Bucket: r2BucketName(),
    Key: objectKey,
  }))
}

export async function signedPromoteVideoUrl(
  objectKey: string,
  expiresInSec = r2SignedUrlExpirySec(),
): Promise<string> {
  const client = r2Client()
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: r2BucketName(), Key: objectKey }),
    { expiresIn: expiresInSec },
  )
}

const PROMOTE_MAX_VIDEO_BYTES = 120 * 1024 * 1024

export interface PromoteStagingPresignedPut {
  url: string
  headers: Record<string, string>
  key: string
  expiresAt: string
  expiresInSec: number
  maxBytes: number
}

export async function presignedPutPromoteStagingVideo(
  input: PromoteStagingKeyInput,
): Promise<PromoteStagingPresignedPut> {
  const key = promoteStagingObjectKey(input)
  const client = r2Client()
  const expiresInSec = promoteStagingPutExpirySec()
  const titleRaw = input.songTitle?.trim() ?? ''
  const artistRaw = input.artistSlug?.trim() ?? ''
  const metaTitle = metaValue(titleRaw) || slugifySegment(titleRaw)
  const metaArtist = metaValue(artistRaw) || slugifySegment(artistRaw)
  const url = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: r2BucketName(),
      Key: key,
      ContentType: 'video/mp4',
      CacheControl: 'private, max-age=60',
      Metadata: {
        'margo-title': metaTitle,
        'margo-artist': metaArtist,
        'margo-promote-staging': '1',
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
      'Content-Type': 'video/mp4',
      'Cache-Control': 'private, max-age=60',
      'x-amz-meta-margo-title': metaTitle,
      'x-amz-meta-margo-artist': metaArtist,
      'x-amz-meta-margo-promote-staging': '1',
    },
    key,
    expiresAt,
    expiresInSec,
    maxBytes: PROMOTE_MAX_VIDEO_BYTES,
  }
}

export async function getPromoteVideoBytesFromR2(objectKey: string): Promise<Buffer> {
  const client = r2Client()
  const out = await client.send(new GetObjectCommand({
    Bucket: r2BucketName(),
    Key: objectKey,
  }))
  if (!out.Body) {
    throw new Error('R2 GetObject returned empty body')
  }
  const chunks: Uint8Array[] = []
  for await (const chunk of out.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  const buf = Buffer.concat(chunks)
  if (buf.length > PROMOTE_MAX_VIDEO_BYTES) {
    throw new Error(`Staged video exceeds max size (${PROMOTE_MAX_VIDEO_BYTES} bytes)`)
  }
  if (buf.length === 0) {
    throw new Error('Staged video is empty (0 bytes)')
  }
  return buf
}
