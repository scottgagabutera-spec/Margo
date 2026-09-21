'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PromoteQueueCard, type PromoteQueueUpdateOptions } from '@/components/promote/promote-queue-card'
import { useRegisterNavBack } from '@/components/nav-back'
import { createClient } from '@/lib/supabase/client'
import { useIdentity } from '@/hooks/useIdentity'
import { TYPE, UI_FONT } from '@/lib/fonts'
import { buildPromoteQueueMoment } from '@/lib/promote/build-queue-moment'
import { publishQueueMomentVideo } from '@/lib/promote/publish-client'
import { clearMomentVideoCache } from '@/lib/moment-export/video/moment-video-cache'
import type { PromoteQueueRow } from '@/lib/promote/types'

const font = UI_FONT
const supabase = createClient()

export default function StudioPromotePage() {
  const { user, identity, loading: identityLoading } = useIdentity()
  const [items, setItems] = useState<PromoteQueueRow[]>([])
  const [audioByPost, setAudioByPost] = useState<Record<string, {
    songId: string | null
    audioUrl: string | null
    snippetStart: number | null
    snippetEnd: number | null
  }>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const autopublishAttempted = useRef<string | null>(null)
  const publishAbortHandlers = useRef<Set<() => void>>(new Set())

  const isActiveArtist = identity?.isArtist && identity.artistStatus === 'active'

  const registerPublishAbort = useCallback((abort: () => void) => {
    publishAbortHandlers.current.add(abort)
    return () => {
      publishAbortHandlers.current.delete(abort)
    }
  }, [])

  const cancelPendingPublishes = useCallback(() => {
    for (const abort of publishAbortHandlers.current) abort()
    publishAbortHandlers.current.clear()
  }, [])

  const loadQueue = useCallback(async (options?: PromoteQueueUpdateOptions) => {
    if (!options?.silent) {
      setLoading(true)
    }
    setError(null)
    try {
      const res = await fetch('/api/promote/queue', { credentials: 'include' })
      if (!res.ok) {
        setError('Could not load promotion queue.')
        if (!options?.silent) setItems([])
        return
      }
      const json = await res.json()
      setItems(json.items || [])
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!identityLoading && isActiveArtist) void loadQueue()
  }, [identityLoading, isActiveArtist, loadQueue])

  const postIds = useMemo(
    () => items.map((i) => i.sourcePostId).filter(Boolean) as string[],
    [items],
  )
  const songIds = useMemo(
    () => [...new Set(items.map((i) => i.sourceSongId).filter(Boolean))] as string[],
    [items],
  )

  useEffect(() => {
    if (postIds.length === 0 && songIds.length === 0) return
    let cancelled = false
    void (async () => {
      const [postsRes, songsRes] = await Promise.all([
        postIds.length
          ? supabase
            .from('posts')
            .select('id, song_id, snippet_start_sec, snippet_end_sec, songs:song_id ( audio_url )')
            .in('id', postIds)
          : Promise.resolve({ data: [] as Record<string, unknown>[] }),
        songIds.length
          ? supabase.from('songs').select('id, audio_url').in('id', songIds)
          : Promise.resolve({ data: [] as Array<{ id: string; audio_url: string | null }> }),
      ])

      if (cancelled) return
      const audioBySong = new Map(
        (songsRes.data || []).map((s) => [s.id, s.audio_url]),
      )
      const map: typeof audioByPost = {}
      for (const row of postsRes.data || []) {
        const song = Array.isArray(row.songs) ? row.songs[0] : row.songs
        const songId = (row.song_id as string | null) ?? null
        map[row.id as string] = {
          songId,
          audioUrl: (song as { audio_url?: string } | null)?.audio_url
            ?? (songId ? audioBySong.get(songId) ?? null : null),
          snippetStart: row.snippet_start_sec as number | null,
          snippetEnd: row.snippet_end_sec as number | null,
        }
      }
      for (const item of items) {
        if (!item.sourcePostId && item.sourceSongId) {
          map[item.id] = {
            songId: item.sourceSongId,
            audioUrl: audioBySong.get(item.sourceSongId) ?? null,
            snippetStart: item.snippetStartSec,
            snippetEnd: item.snippetEndSec,
          }
        }
      }
      setAudioByPost(map)
    })()
    return () => { cancelled = true }
  }, [postIds, songIds, items])

  useEffect(() => {
    const queueId = searchParams.get('autopublish')
    if (!queueId || items.length === 0 || !audioByPost) return
    if (autopublishAttempted.current === queueId) return
    const item = items.find((i) => i.id === queueId && i.status === 'approved')
    if (!item) return
    autopublishAttempted.current = queueId
    const audio = item.sourcePostId
      ? audioByPost[item.sourcePostId]
      : audioByPost[item.id]
    const moment = buildPromoteQueueMoment(item, {
      songId: audio?.songId ?? item.sourceSongId,
      audioUrl: audio?.audioUrl ?? null,
      snippetStart: audio?.snippetStart ?? item.snippetStartSec,
      snippetEnd: audio?.snippetEnd ?? item.snippetEndSec,
    })
    clearMomentVideoCache()
    void publishQueueMomentVideo(queueId, moment)
      .then(() => loadQueue({ silent: true }))
      .catch((err) => {
        if ((err as Error)?.name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Auto-publish failed')
        }
      })
  }, [searchParams, items, audioByPost, loadQueue])

  const handleBack = useCallback(() => {
    cancelPendingPublishes()
  }, [cancelPendingPublishes])

  useRegisterNavBack({
    fallbackHref: '/studio',
    onBack: handleBack,
  })

  if (identityLoading || loading) {
    return (
      <div style={{ padding: 'calc(var(--nav-height, 72px) + 24px) 24px', fontFamily: font, color: 'var(--text-secondary)' }}>
        Loading…
      </div>
    )
  }

  if (!user || !isActiveArtist) {
    return (
      <div style={{ padding: 'calc(var(--nav-height, 72px) + 24px) 24px', maxWidth: 560, margin: '0 auto', fontFamily: font }}>
        <p style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>
          Auto-Promote is available to active verified artists only.
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: 'calc(var(--nav-height, 72px) + 24px) 24px var(--margo-page-padding-bottom)',
      }}
    >
      <h1 style={{ fontFamily: font, fontSize: TYPE.pageTitle, fontWeight: 600, margin: '0 0 8px' }}>
        Promotion queue
      </h1>
      <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)', marginBottom: '8px' }}>
        Review color and effect, Approve, then confirm Publish to YouTube.
      </p>
      <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-muted)', marginBottom: '8px' }}>
        Published, rejected, and failed posts clear from this list after 24 hours.
      </p>
      <Link href="/settings" style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--gold)', textDecoration: 'none' }}>
        Connected accounts & preferences
      </Link>

      {error && (
        <p style={{ fontFamily: font, color: 'var(--text-secondary)', marginTop: '16px' }}>{error}</p>
      )}

      <div style={{ marginTop: '24px' }}>
        {items.length === 0 ? (
          <p style={{ fontFamily: font, fontSize: TYPE.body, color: 'var(--text-secondary)' }}>
            No queued posts. Use &ldquo;Promote to YouTube&rdquo; on one of your Moments to add it here.
          </p>
        ) : (
          items.map((item) => {
            const audio = item.sourcePostId
              ? audioByPost[item.sourcePostId]
              : audioByPost[item.id]
            return (
              <PromoteQueueCard
                key={item.id}
                item={item}
                songId={audio?.songId ?? item.sourceSongId}
                audioUrl={audio?.audioUrl ?? null}
                snippetStart={audio?.snippetStart ?? item.snippetStartSec}
                snippetEnd={audio?.snippetEnd ?? item.snippetEndSec}
                onUpdated={(options) => void loadQueue(options)}
                onPublishAbortRegister={registerPublishAbort}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
