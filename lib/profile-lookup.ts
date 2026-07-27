'use client'
import { supabase } from '@/lib/supabase'

export interface AuthorProfile {
  id: string
  username: string
  displayName: string
  isArtist: boolean
}

type Listener = (profile: AuthorProfile | null) => void

const cache = new Map<string, AuthorProfile | null>()
const listeners = new Map<string, Set<Listener>>()
const pending = new Set<string>()
let flushTimer: ReturnType<typeof setTimeout> | null = null

function notify(id: string, profile: AuthorProfile | null) {
  cache.set(id, profile)
  listeners.get(id)?.forEach(l => l(profile))
}

async function flush() {
  const ids = Array.from(pending)
  pending.clear()
  flushTimer = null
  if (ids.length === 0) return

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, is_artist')
    .in('id', ids)

  if (error) {
    console.error('Batched profile lookup failed:', error)
    ids.forEach(id => notify(id, null))
    return
  }

  const found = new Set<string>()
  ;(data || []).forEach((row: any) => {
    found.add(row.id)
    notify(row.id, {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      isArtist: row.is_artist,
    })
  })
  ids.forEach(id => { if (!found.has(id)) notify(id, null) })
}

/**
 * Subscribes to a live-resolved profile for a given authorUid. Requests
 * made within the same ~30ms window are batched into a single Supabase
 * query (`.in('id', [...])`) instead of one query per post card. Cached
 * after first resolution — repeat subscriptions for the same uid across
 * the feed resolve instantly from cache.
 */
export function subscribeAuthorProfile(authorUid: string, listener: Listener): () => void {
  if (!listeners.has(authorUid)) listeners.set(authorUid, new Set())
  listeners.get(authorUid)!.add(listener)

  if (cache.has(authorUid)) {
    listener(cache.get(authorUid) ?? null)
  } else {
    pending.add(authorUid)
    if (!flushTimer) flushTimer = setTimeout(flush, 30)
  }

  return () => {
    listeners.get(authorUid)?.delete(listener)
  }
}