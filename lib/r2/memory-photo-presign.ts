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
import { memoryMediaObjectKey, type MemoryMediaFileKind } from '@/lib/r2/memory-media-keys'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_VIDEO_BYTES = 50 * 1024 * 1024

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm'])

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

/** @deprecated use memoryMediaObjectKey */
export function memoryPhotoObjectKey(profileId: string, draftId: string, position: number): string {
  return memoryMediaObjectKey(profileId, draftId, position, 'image', 'webp')
}

function extForContentType(contentType: string, kind: MemoryMediaFileKind): string {
  if (kind === 'poster') return 'webp'
  if (VIDEO_TYPES.has(contentType)) {
    return contentType === 'video/webm' ? 'webm' : 'mp4'
  }
  if (contentType === 'image/png') return 'png'
  if (contentType === 'image/jpeg') return 'jpg'
  return 'webp'
}

export async function presignMemoryPhotoUpload(opts: {
  profileId: string
  draftId: string
  position: number
  contentType: string
  byteLength: number
  kind?: MemoryMediaFileKind
}): Promise<{
  url: string
  headers: Record<string, string>
  key: string
  publicUrl: string
  expiresInSec: number
}> {
  const kind = opts.kind ?? 'image'
  if (kind === 'poster') {
    if (opts.contentType !== 'image/webp') throw new Error('Poster must be image/webp')
    if (opts.byteLength < 1 || opts.byteLength > MAX_IMAGE_BYTES) {
      throw new Error('Poster must be under 5 MB')
    }
  } else if (VIDEO_TYPES.has(opts.contentType) || kind === 'video') {
    if (!VIDEO_TYPES.has(opts.contentType)) throw new Error('Unsupported video type')
    if (opts.byteLength < 1 || opts.byteLength > MAX_VIDEO_BYTES) {
      throw new Error('Video must be under 50 MB')
    }
  } else {
    if (!IMAGE_TYPES.has(opts.contentType)) throw new Error('Unsupported image type')
    if (opts.byteLength < 1 || opts.byteLength > MAX_IMAGE_BYTES) {
      throw new Error('Image must be under 5 MB')
    }
  }

  const fileKind: MemoryMediaFileKind =
    kind === 'poster' ? 'poster' : VIDEO_TYPES.has(opts.contentType) ? 'video' : 'image'
  const ext = extForContentType(opts.contentType, fileKind)
  const key = memoryMediaObjectKey(opts.profileId, opts.draftId, opts.position, fileKind, ext)
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
