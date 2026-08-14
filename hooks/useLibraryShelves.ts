'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSongLibrarySaves } from '@/hooks/useSongLibrarySaves'
import {
  fetchLikedSongs,
  fetchListenLaterSongs,
  type LibrarySongRow,
} from '@/lib/library/song-saves'
import { listMyPlaylists, type LibraryPlaylistSummary } from '@/lib/library/playlists'

export function useLibraryShelves(userId: string | null) {
  const { isLiked, isListenLater, loading: savesLoading } = useSongLibrarySaves()
  const [likedRows, setLikedRows] = useState<LibrarySongRow[]>([])
  const [laterRows, setLaterRows] = useState<LibrarySongRow[]>([])
  const [playlists, setPlaylists] = useState<LibraryPlaylistSummary[]>([])
  const [loading, setLoading] = useState(!!userId)

  useEffect(() => {
    if (!userId) {
      setLikedRows([])
      setLaterRows([])
      setPlaylists([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void Promise.all([
      fetchLikedSongs(userId),
      fetchListenLaterSongs(userId),
      listMyPlaylists(userId),
    ]).then(([liked, later, lists]) => {
      if (cancelled) return
      setLikedRows(liked)
      setLaterRows(later)
      setPlaylists(lists)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [userId])

  const liked = useMemo(
    () => likedRows.filter(s => isLiked(s.id)),
    [likedRows, isLiked],
  )
  const listenLater = useMemo(
    () => laterRows.filter(s => isListenLater(s.id)),
    [laterRows, isListenLater],
  )

  return {
    liked,
    listenLater,
    playlists,
    loading: loading || savesLoading,
  }
}
