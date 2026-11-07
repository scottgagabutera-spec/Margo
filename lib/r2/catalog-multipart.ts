import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3'
import {
  catalogObjectKey,
  validateCatalogUploadInput,
  type CatalogUploadPresignInput,
} from '@/lib/r2/catalog-upload-presign'
import { publicCatalogMediaUrl } from '@/lib/r2/catalog-media-url'
import {
  r2AccessKeyId,
  r2BucketName,
  r2S3Endpoint,
  r2SecretAccessKey,
} from '@/lib/r2/config'

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

export async function beginCatalogMultipart(input: CatalogUploadPresignInput) {
  const err = validateCatalogUploadInput(input)
  if (err) throw new Error(err)
  const key = catalogObjectKey(input)
  const client = r2Client()
  const out = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: r2BucketName(),
      Key: key,
      ContentType: input.contentType,
      CacheControl: CACHE_IMMUTABLE,
    }),
  )
  if (!out.UploadId) throw new Error('Could not start multipart upload')
  return {
    uploadId: out.UploadId,
    key,
    publicUrl: publicCatalogMediaUrl(key),
  }
}

export async function uploadCatalogPart(
  key: string,
  uploadId: string,
  partNumber: number,
  body: Buffer | Uint8Array,
): Promise<string> {
  if (partNumber < 1 || partNumber > 10_000) throw new Error('Invalid part number')
  const client = r2Client()
  const out = await client.send(
    new UploadPartCommand({
      Bucket: r2BucketName(),
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
      Body: body,
    }),
  )
  const etag = out.ETag
  if (!etag) throw new Error('Missing part etag')
  return etag
}

export async function completeCatalogMultipart(
  key: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[],
) {
  const client = r2Client()
  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: r2BucketName(),
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
          .slice()
          .sort((a, b) => a.partNumber - b.partNumber)
          .map((p) => ({ ETag: p.etag, PartNumber: p.partNumber })),
      },
    }),
  )
  return { publicUrl: publicCatalogMediaUrl(key), key }
}

export async function abortCatalogMultipart(key: string, uploadId: string) {
  const client = r2Client()
  await client.send(
    new AbortMultipartUploadCommand({
      Bucket: r2BucketName(),
      Key: key,
      UploadId: uploadId,
    }),
  )
}
