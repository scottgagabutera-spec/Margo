'use client'

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useAuthGate } from '@/components/supabase-auth-provider'
import {
  fetchLikedSongIds,
  fetchListenLaterSongIds,
  toggleLikedSong,
  toggleListenLaterSong,
} from '@/lib/library/song-saves'

type SavesSnapshot = {
  userId: string | null
  liked: ReadonlySet<string>
  listenLater: ReadonlySet<string>
  loading: boolean
}

let _snap: SavesSnapshot = {
  userId: null,
  liked: new Set(),
  listenLater: new Set(),
  loading: false,
}
let _loadGen = 0
const _subs = new Set<() => void>()

function emit() {
  _subs.forEach(fn => fn())
}

function subscribe(fn: () => void) {
  _subs.add(fn)
  return () => { _subs.delete(fn) }
}

function getSnapshot() {
  return _snap
}

async function loadForUser(userId: string) {
  const gen = ++_loadGen
  _snap = { ..._snap, userId, loading: true }
  emit()
  const [likedIds, laterIds] = await Promise.all([
    fetchLikedSongIds(userId),
    fetchListenLaterSongIds(userId),
  ])
  if (gen !== _loadGen) return
  _snap = {
    userId,
    liked: new Set(likedIds),
    listenLater: new Set(laterIds),
    loading: false,
  }
  emit()
}

function clearSaves() {
  _loadGen += 1
  _snap = {
    userId: null,
    liked: new Set(),
    listenLater: new Set(),
    loading: false,
  }
  emit()
}

/**
 * Shared Liked + Listen Later sets for the signed-in user.
 * Writes hit liked_songs / listen_later_songs (S1) — Library UI is Phase D.
 */
export function useSongLibrarySaves() {
  const { user, requireAuth } = useAuthGate()
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  useEffect(() => {
    if (!user?.id) {
      clearSaves()
      return
    }
    if (snap.userId !== user.id) {
      void loadForUser(user.id)
    }
  }, [user?.id, snap.userId])

  const isLiked = useCallback(
    (songId: string) => snap.liked.has(songId),
    [snap.liked],
  )
  const isListenLater = useCallback(
    (songId: string) => snap.listenLater.has(songId),
    [snap.listenLater],
  )

  const toggleLike = useCallback(async (songId: string): Promise<boolean> => {
    if (!requireAuth()) return false
    const uid = user?.id
    if (!uid) return false
    const currently = _snap.liked.has(songId)
    const nextLiked = new Set(_snap.liked)
    currently ? nextLiked.delete(songId) : nextLiked.add(songId)
    _snap = { ..._snap, liked: nextLiked }
    emit()
    const result = await toggleLikedSong(uid, songId, currently)
    if (result === null) {
      const revert = new Set(_snap.liked)
      currently ? revert.add(songId) : revert.delete(songId)
      _snap = { ..._snap, liked: revert }
      emit()
      return false
    }
    return true
  }, [requireAuth, user?.id])

  const toggleListenLater = useCallback(async (songId: string): Promise<boolean> => {
    if (!requireAuth()) return false
    const uid = user?.id
    if (!uid) return false
    const currently = _snap.listenLater.has(songId)
    const next = new Set(_snap.listenLater)
    currently ? next.delete(songId) : next.add(songId)
    _snap = { ..._snap, listenLater: next }
    emit()
    const result = await toggleListenLaterSong(uid, songId, currently)
    if (result === null) {
      const revert = new Set(_snap.listenLater)
      currently ? revert.add(songId) : revert.delete(songId)
      _snap = { ..._snap, listenLater: revert }
      emit()
      return false
    }
    return true
  }, [requireAuth, user?.id])

  return useMemo(() => ({
    loading: snap.loading,
    isLiked,
    isListenLater,
    toggleLike,
    toggleListenLater,
    requireAuth,
  }), [snap.loading, isLiked, isListenLater, toggleLike, toggleListenLater, requireAuth])
}
