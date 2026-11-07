import type { SupabaseClient } from '@supabase/supabase-js'
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import {
  r2AccessKeyId,
  r2BucketName,
  r2S3Endpoint,
  r2SecretAccessKey,
} from '@/lib/r2/config'

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

function extractSupabaseStoragePath(
  bucket: 'song-audio' | 'song-artwork',
  url: string,
): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const i = url.indexOf(marker)
  if (i < 0) return null
  return decodeURIComponent(url.slice(i + marker.length))
}

function extractR2Key(url: string): string | null {
  try {
    const u = new URL(url.trim())
    const path = u.pathname.replace(/^\/+/, '')
    if (!path.startsWith('Margo/')) return null
    return path
  } catch {
    return null
  }
}

/** Best-effort delete catalog media objects (R2 preferred; Supabase public buckets as fallback). */
export async function deleteSongMediaObjects(
  admin: SupabaseClient,
  audioUrl: string | null,
  artworkUrl: string | null,
): Promise<void> {
  const bucket = r2BucketName()
  const s3 = r2Client()

  for (const url of [audioUrl, artworkUrl]) {
    if (!url?.trim()) continue
    const r2Key = extractR2Key(url)
    if (r2Key) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: r2Key }))
      } catch (e) {
        console.warn('[song purge] R2 delete failed', r2Key, e)
      }
      continue
    }
    for (const b of ['song-audio', 'song-artwork'] as const) {
      const path = extractSupabaseStoragePath(b, url)
      if (path) {
        const { error } = await admin.storage.from(b).remove([path])
        if (error) console.warn('[song purge] storage remove failed', b, path, error.message)
        break
      }
    }
  }
}
