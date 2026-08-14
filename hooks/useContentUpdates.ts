'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

const SONGS_SEEN_KEY = 'margo.contentSeen.songs'
const ARTISTS_SEEN_KEY = 'margo.contentSeen.artists'
const CATCH_UP_LIMIT = 20

export type ContentUpdateRow = {
  id: string
  title: string
  href: string
}

function nowIso() {
  return new Date().toISOString()
}

function readCursor(key: string): string {
  try {
    const stored = sessionStorage.getItem(key)
    if (stored) return stored
  } catch {
    /* private mode */
  }
  const fresh = nowIso()
  writeCursor(key, fresh)
  return fresh
}

function writeCursor(key: string, iso: string) {
  try {
    sessionStorage.setItem(key, iso)
  } catch {
    /* private mode */
  }
}

function songHref(id: string) {
  return `/song/${id}`
}

function artistHref(username: string) {
  return `/profile/${username}`
}

function isCatalogVisible(status: string | null | undefined) {
  return status != null && status !== 'hidden' && status !== 'draft' && status !== 'processing'
}

/**
 * Inbox of new catalog songs + new artists since last Feed visit.
 * Lyrics stay in useNewItemsBuffer; this hook only owns songs/artists.
 * Realtime while Feed is the active tab; catch-up query on each return.
 * Does not mutate the Feed list.
 */
export function useContentUpdates(options: { enabled: boolean }) {
  const enabled = options.enabled
  const router = useRouter()
  const [songs, setSongs] = useState<ContentUpdateRow[]>([])
  const [artists, setArtists] = useState<ContentUpdateRow[]>([])
  const songsRef = useRef(songs)
  const artistsRef = useRef(artists)
  songsRef.current = songs
  artistsRef.current = artists

  const mergeSongs = useCallback((incoming: ContentUpdateRow[]) => {
    if (incoming.length === 0) return
    setSongs((prev) => {
      const seen = new Set(prev.map((s) => s.id))
      const extra = incoming.filter((s) => !seen.has(s.id))
      return extra.length === 0 ? prev : [...extra, ...prev]
    })
  }, [])

  const mergeArtists = useCallback((incoming: ContentUpdateRow[]) => {
    if (incoming.length === 0) return
    setArtists((prev) => {
      const seen = new Set(prev.map((s) => s.id))
      const extra = incoming.filter((s) => !seen.has(s.id))
      return extra.length === 0 ? prev : [...extra, ...prev]
    })
  }, [])

  const catchUp = useCallback(async () => {
    const songsSince = readCursor(SONGS_SEEN_KEY)
    const artistsSince = readCursor(ARTISTS_SEEN_KEY)

    const [songRes, artistRes] = await Promise.all([
      supabase
        .from('songs')
        .select('id, title, artist_display_name, status, created_at')
        .gt('created_at', songsSince)
        .neq('status', 'hidden')
        .neq('status', 'draft')
        .neq('status', 'processing')
        .order('created_at', { ascending: false })
        .limit(CATCH_UP_LIMIT),
      supabase
        .from('profiles')
        .select('id, username, display_name, is_artist, created_at')
        .eq('is_artist', true)
        .gt('created_at', artistsSince)
        .order('created_at', { ascending: false })
        .limit(CATCH_UP_LIMIT),
    ])

    if (songRes.data) {
      mergeSongs(
        songRes.data
          .filter((row) => isCatalogVisible(row.status))
          .map((row) => ({
            id: row.id,
            title: row.title || 'Untitled',
            href: songHref(row.id),
          })),
      )
    }

    if (artistRes.data) {
      mergeArtists(
        artistRes.data
          .filter((row) => typeof row.username === 'string' && row.username.length > 0)
          .map((row) => ({
            id: row.id,
            title: (row.display_name || row.username) as string,
            href: artistHref(row.username as string),
          })),
      )
    }
  }, [mergeArtists, mergeSongs])

  useEffect(() => {
    if (!enabled) return

    void catchUp()

    const topic = `content_updates:${crypto.randomUUID()}`
    const channel = supabase.channel(topic)

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'songs' },
      (payload) => {
        const row = payload.new as {
          id?: string
          title?: string
          status?: string
        } | null
        const prev = payload.old as { status?: string } | null
        if (!row?.id || !isCatalogVisible(row.status)) return
        if (payload.eventType === 'UPDATE' && prev && isCatalogVisible(prev.status)) return
        mergeSongs([{ id: row.id, title: row.title || 'Untitled', href: songHref(row.id) }])
      },
    )

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      (payload) => {
        const next = payload.new as {
          id?: string
          username?: string
          display_name?: string | null
          is_artist?: boolean
        } | null
        const prev = payload.old as { is_artist?: boolean } | null
        if (!next?.id || !next.is_artist || !next.username) return
        if (prev?.is_artist === true) return
        mergeArtists([
          {
            id: next.id,
            title: next.display_name || next.username,
            href: artistHref(next.username),
          },
        ])
      },
    )

    channel.subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [enabled, catchUp, mergeArtists, mergeSongs])

  const clearSongs = useCallback(() => {
    writeCursor(SONGS_SEEN_KEY, nowIso())
    setSongs([])
  }, [])

  const clearArtists = useCallback(() => {
    writeCursor(ARTISTS_SEEN_KEY, nowIso())
    setArtists([])
  }, [])

  const openSongs = useCallback(() => {
    const rows = songsRef.current
    clearSongs()
    if (rows.length === 1) router.push(rows[0].href)
    else router.push('/discover/songs')
  }, [clearSongs, router])

  const openArtists = useCallback(() => {
    const rows = artistsRef.current
    clearArtists()
    if (rows.length === 1) router.push(rows[0].href)
    else router.push('/discover')
  }, [clearArtists, router])

  return {
    songCount: songs.length,
    artistCount: artists.length,
    openSongs,
    openArtists,
  }
}
