import {
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { GetObjectCommand } from '@aws-sdk/client-s3'

const DEFAULT_EXPIRY_SEC = 3600

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function r2Client(): S3Client {
  const accountId = requireEnv('R2_ACCOUNT_ID')
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
  })
}

function promoteBucket(): string {
  return process.env.R2_PROMOTE_BUCKET || process.env.R2_BUCKET_NAME || 'margo-promote'
}

/** Upload rendered MP4 to R2 under Margo/promote/{profileId}/{queueId}.mp4 */
export async function uploadPromoteVideo(
  profileId: string,
  queueId: string,
  videoBytes: Buffer,
): Promise<{ objectKey: string; byteSize: number }> {
  const objectKey = `Margo/promote/${profileId}/${queueId}.mp4`
  const client = r2Client()
  await client.send(new PutObjectCommand({
    Bucket: promoteBucket(),
    Key: objectKey,
    Body: videoBytes,
    ContentType: 'video/mp4',
    CacheControl: 'private, max-age=3600',
  }))
  return { objectKey, byteSize: videoBytes.length }
}

/** Short-lived signed HTTPS URL for platform upload APIs (YouTube pulls from client upload path). */
export async function signedPromoteVideoUrl(
  objectKey: string,
  expiresInSec = Number(process.env.R2_PROMOTE_SIGNED_URL_EXPIRY_SEC || DEFAULT_EXPIRY_SEC),
): Promise<string> {
  const client = r2Client()
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: promoteBucket(), Key: objectKey }),
    { expiresIn: expiresInSec },
  )
}
