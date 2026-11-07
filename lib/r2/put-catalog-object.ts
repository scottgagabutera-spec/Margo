import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import {
  r2AccessKeyId,
  r2BucketName,
  r2S3Endpoint,
  r2SecretAccessKey,
} from '@/lib/r2/config'
import {
  catalogObjectKey,
  validateCatalogUploadInput,
  type CatalogUploadPresignInput,
} from '@/lib/r2/catalog-upload-presign'
import { publicCatalogMediaUrl } from '@/lib/r2/catalog-media-url'

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

/** Server-side put (no browser CORS). */
export async function putCatalogObjectServer(
  input: CatalogUploadPresignInput,
  body: Buffer | Uint8Array,
): Promise<{ key: string; publicUrl: string }> {
  const err = validateCatalogUploadInput(input)
  if (err) throw new Error(err)
  const key = catalogObjectKey(input)
  const client = r2Client()
  await client.send(
    new PutObjectCommand({
      Bucket: r2BucketName(),
      Key: key,
      Body: body,
      ContentType: input.contentType,
      CacheControl: CACHE_IMMUTABLE,
    }),
  )
  return { key, publicUrl: publicCatalogMediaUrl(key) }
}
