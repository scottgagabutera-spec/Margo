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

const MAX_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

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

export function memoryPhotoObjectKey(profileId: string, draftId: string, position: number): string {
  const p = Math.max(0, Math.min(29, position))
  return `Margo/memories/${profileId.slice(0, 8)}/${draftId}/${p}.webp`
}

export async function presignMemoryPhotoUpload(opts: {
  profileId: string
  draftId: string
  position: number
  contentType: string
  byteLength: number
}): Promise<{
  url: string
  headers: Record<string, string>
  key: string
  publicUrl: string
  expiresInSec: number
}> {
  if (!IMAGE_TYPES.has(opts.contentType)) {
    throw new Error('Unsupported image type')
  }
  if (opts.byteLength < 1 || opts.byteLength > MAX_BYTES) {
    throw new Error('Image must be under 5 MB')
  }

  const key = memoryPhotoObjectKey(opts.profileId, opts.draftId, opts.position)
  const expiresInSec = catalogUploadPutExpirySec()
  const command = new PutObjectCommand({
    Bucket: r2BucketName(),
    Key: key,
    ContentType: opts.contentType,
    ContentLength: opts.byteLength,
    CacheControl: 'public, max-age=31536000, immutable',
  })
  const url = await getSignedUrl(r2Client(), command, { expiresIn: expiresInSec })
  return {
    url,
    headers: { 'Content-Type': opts.contentType, 'Content-Length': String(opts.byteLength) },
    key,
    publicUrl: publicCatalogMediaUrl(key),
    expiresInSec,
  }
}
