'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BackButton } from '@/components/back-button'
import { PromoteQueueCard } from '@/components/promote/promote-queue-card'
import { createClient } from '@/lib/supabase/client'
import { useIdentity } from '@/hooks/useIdentity'
import { UI_FONT } from '@/lib/fonts'
import { buildPromoteQueueMoment } from '@/lib/promote/build-queue-moment'
import { publishQueueMomentVideo } from '@/lib/promote/publish-client'
import type { PromoteQueueRow } from '@/lib/promote/types'

const font = UI_FONT
const supabase = createClient()

export default function StudioPromotePage() {
  const { user, identity, loading: identityLoading } = useIdentity()
  const [items, setItems] = useState<PromoteQueueRow[]>([])
  const [audioByPost, setAudioByPost] = useState<Record<string, {
    audioUrl: string | null
    snippetStart: number | null
    snippetEnd: number | null
  }>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const autopublishAttempted = useRef<string | null>(null)

  const isActiveArtist = identity?.isArtist && identity.artistStatus === 'active'

  const loadQueue = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/promote/queue', { credentials: 'include' })
      if (!res.ok) {
        setError('Could not load promotion queue.')
        setItems([])
        return
      }
      const json = await res.json()
      setItems(json.items || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!identityLoading && isActiveArtist) void loadQueue()
  }, [identityLoading, isActiveArtist, loadQueue])

  const postIds = useMemo(
    () => items.map((i) => i.sourcePostId).filter(Boolean) as string[],
    [items],
  )

  useEffect(() => {
    if (postIds.length === 0) return
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('posts')
        .select(`
          id,
          snippet_start_sec,
          snippet_end_sec,
          songs:song_id ( audio_url )
        `)
        .in('id', postIds)

      if (cancelled || !data) return
      const map: typeof audioByPost = {}
      for (const row of data) {
        const song = Array.isArray(row.songs) ? row.songs[0] : row.songs
        map[row.id as string] = {
          audioUrl: (song as { audio_url?: string } | null)?.audio_url ?? null,
          snippetStart: row.snippet_start_sec as number | null,
          snippetEnd: row.snippet_end_sec as number | null,
        }
      }
      setAudioByPost(map)
    })()
    return () => { cancelled = true }
  }, [postIds])

  useEffect(() => {
    const queueId = searchParams.get('autopublish')
    if (!queueId || items.length === 0 || !audioByPost) return
    if (autopublishAttempted.current === queueId) return
    const item = items.find((i) => i.id === queueId && i.status === 'approved')
    if (!item) return
    autopublishAttempted.current = queueId
    const audio = item.sourcePostId ? audioByPost[item.sourcePostId] : undefined
    const moment = buildPromoteQueueMoment(item, audio)
    void publishQueueMomentVideo(queueId, moment)
      .then(() => loadQueue())
      .catch((err) => setError(err instanceof Error ? err.message : 'Auto-publish failed'))
  }, [searchParams, items, audioByPost, loadQueue])

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
        <BackButton fallbackHref="/studio" label="Studio" />
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
      <BackButton fallbackHref="/studio" label="Studio" />
      <h1 style={{ fontFamily: font, fontSize: '1.4rem', fontWeight: 600, margin: '16px 0 8px' }}>
        Promotion queue
      </h1>
      <p style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
        Review, polish color or effect, then publish to YouTube.
      </p>
      <Link href="/settings" style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--gold)', textDecoration: 'none' }}>
        Connected accounts & preferences →
      </Link>

      {error && (
        <p style={{ fontFamily: font, color: 'var(--danger, #e55)', marginTop: '16px' }}>{error}</p>
      )}

      <div style={{ marginTop: '24px' }}>
        {items.length === 0 ? (
          <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            No queued posts. Use &ldquo;Promote to YouTube&rdquo; on one of your Moments to add it here.
          </p>
        ) : (
          items.map((item) => {
            const audio = item.sourcePostId ? audioByPost[item.sourcePostId] : undefined
            return (
              <PromoteQueueCard
                key={item.id}
                item={item}
                audioUrl={audio?.audioUrl}
                snippetStart={audio?.snippetStart}
                snippetEnd={audio?.snippetEnd}
                onUpdated={() => void loadQueue()}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
