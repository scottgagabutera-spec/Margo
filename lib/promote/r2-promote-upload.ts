import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  r2AccessKeyId,
  r2BucketName,
  r2PublicMediaHost,
  r2S3Endpoint,
  r2SecretAccessKey,
  r2SignedUrlExpirySec,
} from '@/lib/r2/config'

/** Prefix alongside catalog audio (Margo/audio/*) and artwork (Margo/artwork/*). */
export const PROMOTE_OBJECT_PREFIX = 'Margo/promote'

export function promoteVideoObjectKey(profileId: string, queueId: string): string {
  return `${PROMOTE_OBJECT_PREFIX}/${profileId}/${queueId}.mp4`
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
