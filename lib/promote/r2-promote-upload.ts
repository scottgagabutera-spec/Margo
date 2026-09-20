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
): Promise<{ objectKey: string; byteSize: number }> {
  const objectKey = promoteVideoObjectKey(profileId, queueId)
  const client = r2Client()
  await client.send(new PutObjectCommand({
    Bucket: r2BucketName(),
    Key: objectKey,
    Body: videoBytes,
    ContentType: 'video/mp4',
    CacheControl: 'private, max-age=3600',
  }))
  return { objectKey, byteSize: videoBytes.length }
}

/** Delete a staged promote MP4. Throws on R2 errors (caller logs). */
export async function deletePromoteVideo(objectKey: string): Promise<void> {
  const client = r2Client()
  await client.send(new DeleteObjectCommand({
    Bucket: r2BucketName(),
    Key: objectKey,
  }))
}

/** Short-lived signed HTTPS URL for platform upload APIs. */
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
