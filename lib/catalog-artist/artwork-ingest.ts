import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import {
  r2AccessKeyId,
  r2BucketName,
  r2S3Endpoint,
  r2SecretAccessKey,
} from '@/lib/r2/config'
import { publicCatalogMediaUrl } from '@/lib/r2/catalog-media-url'

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

export function catalogArtistArtworkKey(catalogArtistId: string, size: 96 | 256): string {
  return `Margo/catalog-artists/${catalogArtistId}/art-${size}.webp`
}

export async function ingestCatalogArtistArtwork(
  catalogArtistId: string,
  remoteUrl: string,
): Promise<{ key96: string; publicUrl96: string }> {
  const res = await fetch(remoteUrl, { signal: AbortSignal.timeout(12_000) })
  if (!res.ok) throw new Error('Could not fetch artwork')
  const buf = Buffer.from(await res.arrayBuffer())

  const webp96 = await sharp(buf).rotate().resize(96, 96, { fit: 'cover' }).webp({ quality: 82 }).toBuffer()
  const webp256 = await sharp(buf).rotate().resize(256, 256, { fit: 'cover' }).webp({ quality: 84 }).toBuffer()

  const key96 = catalogArtistArtworkKey(catalogArtistId, 96)
  const key256 = catalogArtistArtworkKey(catalogArtistId, 256)
  const s3 = r2Client()
  const bucket = r2BucketName()
  const cache = 'public, max-age=31536000, immutable'

  await Promise.all([
    s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key96,
        Body: webp96,
        ContentType: 'image/webp',
        CacheControl: cache,
      }),
    ),
    s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key256,
        Body: webp256,
        ContentType: 'image/webp',
        CacheControl: cache,
      }),
    ),
  ])

  return { key96, publicUrl96: publicCatalogMediaUrl(key96) }
}
