import type { SupabaseClient } from '@supabase/supabase-js'
import { logStagingCleanupFailure, recordStagingCleanupFailure } from '@/lib/promote/cleanup-staging-failures'
import { deletePromoteVideoWithRetry } from '@/lib/promote/cleanup-staging'
import { resolvePromoteObjectKey } from '@/lib/promote/r2-promote-upload'
import {
  promoteStagingObjectKeyParts,
  legacyPromoteStagingFlatKey,
  legacyPromoteStagingReadableKey,
} from '@/lib/r2/r2-object-naming'
import { PROMOTE_CANDIDATE_EXPIRY_MS } from '@/lib/promote/types'

type ExpiredQueueRow = {
  id: string
  profile_id: string
  status: string
  rendered_video_url: string | null
  song_title: string | null
  artist_name: string | null
  created_at: string
  updated_at: string
  reviewed_at: string | null
}

export interface ExpireCandidatesResult {
  scanned: number
  deleted: number
  r2Deleted: number
  r2Failed: number
  errors: string[]
}

function expiryCutoffIso(nowMs = Date.now()): string {
  return new Date(nowMs - PROMOTE_CANDIDATE_EXPIRY_MS).toISOString()
}

function collectStagingKeysToDelete(
  row: ExpiredQueueRow,
  usernameByProfile: Map<string, string>,
): string[] {
  const keys = new Set<string>()
  const songTitle = typeof row.song_title === 'string' ? row.song_title.trim() : ''
  const artistName = typeof row.artist_name === 'string' ? row.artist_name.trim() : ''
  const username = usernameByProfile.get(row.profile_id)?.trim() ?? ''
  const artistSlug = username || artistName
  if (artistSlug && songTitle) {
    keys.add(
      promoteStagingObjectKeyParts(artistSlug, row.profile_id, songTitle, row.id),
    )
  }
  if (artistName && songTitle) {
    keys.add(legacyPromoteStagingReadableKey(artistName, row.profile_id, songTitle, row.id))
  }
  keys.add(legacyPromoteStagingFlatKey(row.profile_id, row.id))
  return [...keys]
}

/**
 * Delete promote_queue rows in pending_review or rejected older than 2 hours.
 * Deletes R2 staging candidates and any object referenced by rendered_video_url.
 */
export async function expirePromoteQueueCandidates(
  admin: SupabaseClient,
  batchLimit = 100,
): Promise<ExpireCandidatesResult> {
  const cutoff = expiryCutoffIso()
  const result: ExpireCandidatesResult = {
    scanned: 0,
    deleted: 0,
    r2Deleted: 0,
    r2Failed: 0,
    errors: [],
  }

  const [pendingRes, rejectedRes] = await Promise.all([
    admin
      .from('promote_queue')
      .select(
        'id, profile_id, status, rendered_video_url, song_title, artist_name, created_at, updated_at, reviewed_at',
      )
      .eq('status', 'pending_review')
      .lt('created_at', cutoff)
      .limit(batchLimit),
    admin
      .from('promote_queue')
      .select(
        'id, profile_id, status, rendered_video_url, song_title, artist_name, created_at, updated_at, reviewed_at',
      )
      .eq('status', 'rejected')
      .lt('updated_at', cutoff)
      .limit(batchLimit),
  ])

  if (pendingRes.error) {
    result.errors.push(`pending_review query failed: ${pendingRes.error.message}`)
  }
  if (rejectedRes.error) {
    result.errors.push(`rejected query failed: ${rejectedRes.error.message}`)
  }

  const rows = [
    ...(pendingRes.data || []),
    ...(rejectedRes.data || []),
  ] as ExpiredQueueRow[]

  const uniqueById = new Map(rows.map((row) => [row.id, row]))
  result.scanned = uniqueById.size

  const profileIds = [...new Set([...uniqueById.values()].map((r) => r.profile_id))]
  const usernameByProfile = new Map<string, string>()
  if (profileIds.length > 0) {
    const { data: profs, error: profErr } = await admin
      .from('profiles')
      .select('id, username')
      .in('id', profileIds)
    if (profErr) {
      result.errors.push(`profiles query failed: ${profErr.message}`)
    } else {
      for (const p of profs || []) {
        if (typeof p.id === 'string' && typeof p.username === 'string') {
          usernameByProfile.set(p.id, p.username)
        }
      }
    }
  }

  for (const row of uniqueById.values()) {
    const keysToTry = new Set<string>()
    for (const k of collectStagingKeysToDelete(row, usernameByProfile)) {
      keysToTry.add(k)
    }
    if (row.rendered_video_url?.trim()) {
      keysToTry.add(resolvePromoteObjectKey(row.profile_id, row.id, row.rendered_video_url))
    }

    for (const objectKey of keysToTry) {
      const deleteResult = await deletePromoteVideoWithRetry(objectKey)
      if (deleteResult.ok) {
        result.r2Deleted += 1
        continue
      }
      result.r2Failed += 1
      logStagingCleanupFailure({
        event: 'expiry_r2_delete_failed',
        queueId: row.id,
        profileId: row.profile_id,
        objectKey,
        status: row.status,
        error: deleteResult.error,
      })
      await recordStagingCleanupFailure(admin, {
        queueId: row.id,
        profileId: row.profile_id,
        objectKey,
        reason: 'r2_delete_error',
        errorMessage: deleteResult.error,
      })
    }

    const { error: deleteErr } = await admin
      .from('promote_queue')
      .delete()
      .eq('id', row.id)

    if (deleteErr) {
      result.errors.push(`delete ${row.id} failed: ${deleteErr.message}`)
      continue
    }

    result.deleted += 1
    console.info('[promote/cleanup] expired queue row', {
      queueId: row.id,
      status: row.status,
      attemptedKeys: keysToTry.size,
    })
  }

  return result
}
