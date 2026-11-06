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
import { promoteStagingObjectKey } from '@/lib/promote/promote-staging-path'

/** Prefix alongside catalog audio (Margo/audio/*) and artwork (Margo/artwork/*). */
export const PROMOTE_OBJECT_PREFIX = 'Margo/promote'

export function promoteVideoObjectKey(profileId: string, queueId: string): string {
  return `${PROMOTE_OBJECT_PREFIX}/${profileId}/${queueId}.mp4`
}

export { promoteStagingObjectKey } from '@/lib/promote/promote-staging-path'

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
  profileId: string,
  queueId: string,
): Promise<{ objectKey: string; publicUrl: string }> {
  const finalKey = promoteVideoObjectKey(profileId, queueId)
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

/** Upload rendered MP4 to R2 under Margo/promote/{profileId}/{queueId}.mp4 */
export async function uploadPromoteVideo(
  profileId: string,
  queueId: string,
  videoBytes: Buffer,
): Promise<{ objectKey: string; byteSize: number; publicUrl: string }> {
  const objectKey = promoteVideoObjectKey(profileId, queueId)
  const client = r2Client()
  await client.send(new PutObjectCommand({
    Bucket: r2BucketName(),
    Key: objectKey,
    Body: videoBytes,
    ContentType: 'video/mp4',
    // Public via audio.trymargo.com — stable until cleanup deletes the object.
    CacheControl: 'public, max-age=86400',
  }))
  return {
    objectKey,
    byteSize: videoBytes.length,
    publicUrl: publicPromoteVideoUrl(objectKey),
  }
}

/**
 * Stable public HTTPS URL for platform fetch (TikTok, Meta, etc.).
 * Requires Margo/promote/* publicly readable on the R2 custom domain.
 */
export function publicPromoteVideoUrl(objectKey: string): string {
  const normalized = objectKey.replace(/^\/+/, '')
  return `https://${r2PublicMediaHost()}/${normalized}`
}

/** Resolve object key from a public promote URL (audio.trymargo.com/Margo/promote/...). */
export function parsePromoteVideoObjectKeyFromUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  try {
    const key = new URL(url.trim()).pathname.replace(/^\/+/, '')
    return key.startsWith(`${PROMOTE_OBJECT_PREFIX}/`) ? key : null
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
    ?? promoteVideoObjectKey(profileId, queueId)
}

/** Delete a staged promote MP4. Throws on R2 errors (caller logs). */
export async function deletePromoteVideo(objectKey: string): Promise<void> {
  const client = r2Client()
  await client.send(new DeleteObjectCommand({
    Bucket: r2BucketName(),
    Key: objectKey,
  }))
}

/** Short-lived signed URL — legacy/internal only; do not pass to Buffer. */
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

/** Browser uploads rendered MP4 to this key only; server reads via GetObject, then copies to final promote key. */
export async function presignedPutPromoteStagingVideo(
  profileId: string,
  queueId: string,
): Promise<PromoteStagingPresignedPut> {
  const key = promoteStagingObjectKey(profileId, queueId)
  const client = r2Client()
  const expiresInSec = promoteStagingPutExpirySec()
  const url = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: r2BucketName(),
      Key: key,
      ContentType: 'video/mp4',
      /** Staging object is ephemeral; overwrite on retry. */
      CacheControl: 'private, max-age=60',
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
      'X-Amz-Meta-Margo-Promote-Staging': '1',
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
  // Body is SdkStreamMixin in AWS SDK v3
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
