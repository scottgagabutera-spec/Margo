'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { CardExportModal } from '@/components/card-export-modal'
import { FeedIconHeart, FeedIconHeartFilled } from '@/components/feed-card-icons'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { CardIcon } from '@/components/icons'
import { compactArtworkUrl } from '@/lib/compact-artwork-url'
import { formatMemoryDatePublic } from '@/lib/memory/date-label'
import type { MemoryPublic, MemoryVisibility } from '@/lib/memory/types'
import { TYPE, UI_FONT } from '@/lib/fonts'
import { playFull } from '@/lib/audio-engine'
import { useRegisterNavBack } from '@/components/nav-back'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { MARGO_SITE_ORIGIN } from '@/lib/moment/site-origin'
import { toast } from 'sonner'
import { MemoryDetailPageSkeleton } from '@/components/margo-skeletons'

const font = UI_FONT

export default function MemoryDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id || ''
  const { requireAuth } = useAuthGate()

  const [memory, setMemory] = useState<MemoryPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cardOpen, setCardOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [lyricBackText, setLyricBackText] = useState('')
  const [lyricBackBusy, setLyricBackBusy] = useState(false)
  const [resonateBusy, setResonateBusy] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/memories/${id}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Not found')
      }
      setMemory((data as { memory: MemoryPublic }).memory)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Not found')
      setMemory(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  useRegisterNavBack({ preferHistory: true, fallbackHref: '/feed' })

  const toggleResonate = async () => {
    if (!memory || resonateBusy) return
    if (!requireAuth()) return
    setResonateBusy(true)
    const prev = memory.viewerResonated
    const prevCount = memory.resonateCount
    setMemory({
      ...memory,
      viewerResonated: !prev,
      resonateCount: Math.max(0, prevCount + (prev ? -1 : 1)),
    })
    try {
      const res = await fetch(`/api/memories/${memory.id}/resonate`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Could not resonate')
      if ((data as { memory?: MemoryPublic }).memory) {
        setMemory((data as { memory: MemoryPublic }).memory)
      }
    } catch {
      setMemory({ ...memory, viewerResonated: prev, resonateCount: prevCount })
      toast.error('Could not resonate')
    } finally {
      setResonateBusy(false)
    }
  }

  const playAll = () => {
    if (!memory) return
    const first = memory.songs.find((s) => s.songId && s.audioUrl && !s.isLyricOnly)
    if (!first?.songId || !first.audioUrl) {
      toast('No Margo audio for this memory')
      return
    }
    void playFull({
      songId: first.songId,
      audioUrl: first.audioUrl,
      title: first.songTitle,
      artist: first.artistName,
      artwork: first.artworkUrl,
      autoplay: true,
      source: 'feed-tier1',
    })
  }

  const submitLyricBack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memory || lyricBackBusy) return
    if (!requireAuth()) return
    const body = lyricBackText.trim()
    if (!body) return
    setLyricBackBusy(true)
    try {
      const res = await fetch(`/api/memories/${memory.id}/lyric-back`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Could not post')
      setLyricBackText('')
      toast('Lyric back posted')
      void load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not post')
    } finally {
      setLyricBackBusy(false)
    }
  }

  const patchVisibility = async (v: MemoryVisibility) => {
    if (!memory?.isOwner) return
    try {
      const res = await fetch(`/api/memories/${memory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: v }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Could not update')
      if ((data as { memory?: MemoryPublic }).memory) {
        setMemory((data as { memory: MemoryPublic }).memory)
        toast('Visibility updated')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update')
    }
    setMenuOpen(false)
  }

  const deleteMemory = async () => {
    if (!memory?.isOwner) return
    setMenuOpen(false)
    try {
      const res = await fetch(`/api/memories/${memory.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Could not delete')
      toast('Memory removed', {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              const restoreRes = await fetch(`/api/memories/${memory.id}/restore`, { method: 'POST' })
              if (!restoreRes.ok) throw new Error('Could not restore')
              toast('Restored')
              void load()
            } catch {
              toast.error('Could not restore')
            }
          },
        },
      })
      router.replace('/feed')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete')
    }
  }

  const shareMemory = async () => {
    if (!memory) return
    const url = `${MARGO_SITE_ORIGIN}/memory/${memory.id}`
    const shareTitle = memory.title
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url })
        return
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
      }
    }
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url)
        toast('Link copied')
      } catch {
        toast.error('Could not share')
      }
    }
    setMenuOpen(false)
  }

  if (loading) {
    return <MemoryDetailPageSkeleton />
  }

  if (error || !memory) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: 'calc(var(--nav-height, 72px) + 24px) 24px' }}>
        <p style={{ fontFamily: font, color: 'var(--text-muted)' }}>{error || 'Not found'}</p>
      </div>
    )
  }

  const dateChip = formatMemoryDatePublic({
    granularity: memory.dateGranularity,
    dateStart: memory.dateStart,
    dateEnd: memory.dateEnd,
    showDatePublicly: memory.showDatePublicly,
  })
  const firstSong = memory.songs[0]
  const story = (memory.story || '').trim()

  return (
    <article
      className="margo-memory-detail"
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        padding: 'calc(var(--nav-height, 72px) + 12px) 20px var(--margo-page-padding-bottom)',
        maxWidth: 640,
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      {memory.coverUrl ? (
        <div
          style={{
            width: '100%',
            aspectRatio: '16/10',
            borderRadius: 16,
            background: `center/cover no-repeat url(${memory.coverUrl})`,
            marginBottom: 16,
            border: '1px solid var(--border)',
          }}
        />
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {dateChip ? (
          <span style={{ fontFamily: font, fontSize: TYPE.label, color: 'var(--gold)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '6px 10px', borderRadius: 999, border: '1px solid var(--gold-border)', background: 'var(--gold-faint)' }}>
            {dateChip}
          </span>
        ) : null}
        {memory.mood ? (
          <span style={{ fontFamily: font, fontSize: TYPE.label, color: 'var(--text-muted)', padding: '6px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)' }}>
            {memory.mood}
          </span>
        ) : null}
      </div>

      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: '0 0 8px', fontFamily: font, fontSize: TYPE.pageTitle, fontWeight: 600, color: 'var(--text)', lineHeight: 1.25 }}>
            {memory.title}
          </h1>
          <Link href={`/profile/${memory.ownerUsername}`} style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)', textDecoration: 'none' }}>
            {memory.ownerDisplayName}
          </Link>
        </div>
        {memory.isOwner ? (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              aria-label="Memory options"
              onClick={() => setMenuOpen((o) => !o)}
              style={{
                width: 'var(--margo-touch-min)',
                height: 'var(--margo-touch-min)',
                borderRadius: '50%',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                cursor: 'pointer',
                fontFamily: font,
                color: 'var(--text)',
              }}
            >
              …
            </button>
            {menuOpen ? (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 4px)',
                  minWidth: 200,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  padding: 8,
                  zIndex: 50,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                }}
              >
                <p style={{ margin: '4px 8px 8px', fontFamily: font, fontSize: TYPE.label, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Visibility</p>
                {(['public', 'followers', 'only_me'] as MemoryVisibility[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => void patchVisibility(v)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      minHeight: 'var(--margo-touch-min)',
                      border: 'none',
                      background: memory.visibility === v ? 'var(--gold-faint)' : 'transparent',
                      color: 'var(--text)',
                      fontFamily: font,
                      fontSize: TYPE.secondary,
                      padding: '0 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    {v === 'only_me' ? 'Only me' : v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
                <button type="button" onClick={() => void shareMemory()} style={{ display: 'block', width: '100%', textAlign: 'left', minHeight: 'var(--margo-touch-min)', border: 'none', background: 'transparent', color: 'var(--text)', fontFamily: font, fontSize: TYPE.secondary, padding: '0 12px', cursor: 'pointer' }}>
                  Share
                </button>
                <button type="button" onClick={() => void deleteMemory()} style={{ display: 'block', width: '100%', textAlign: 'left', minHeight: 'var(--margo-touch-min)', border: 'none', background: 'transparent', color: 'var(--danger, #e57373)', fontFamily: font, fontSize: TYPE.secondary, padding: '0 12px', cursor: 'pointer' }}>
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      {story ? (
        <p style={{ fontFamily: font, fontSize: TYPE.body, color: 'var(--text-secondary)', lineHeight: 1.55, margin: '0 0 20px', whiteSpace: 'pre-wrap' }}>
          {story}
        </p>
      ) : null}

      <section style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontFamily: font, fontSize: TYPE.label, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Songs</h2>
          <button
            type="button"
            onClick={playAll}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              minHeight: 'var(--margo-touch-min)',
              padding: '0 12px',
              borderRadius: 999,
              border: '1px solid var(--gold-border)',
              background: 'var(--gold-faint)',
              color: 'var(--gold)',
              fontFamily: font,
              fontSize: TYPE.label,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            <PlayPauseIcon playing={false} buffering={false} size={14} color="var(--gold)" />
            Play all
          </button>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {memory.songs.map((s) => (
            <li
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
            >
              {s.artworkUrl ? (
                <img src={compactArtworkUrl(s.artworkUrl, 80)} alt="" width={44} height={44} style={{ borderRadius: 8, objectFit: 'cover' }} />
              ) : (
                <span style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--surface-2)' }} />
              )}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.songTitle}</span>
                <span style={{ display: 'block', fontFamily: font, fontSize: TYPE.meta, color: 'var(--text-muted)' }}>{s.artistName}</span>
              </span>
              {s.isLyricOnly ? (
                <span style={{ fontFamily: font, fontSize: TYPE.label, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Lyric only</span>
              ) : s.songId ? (
                <Link href={`/song/${s.songId}`} style={{ fontFamily: font, fontSize: TYPE.label, color: 'var(--gold)', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  On Margo
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {memory.photos.length > 0 ? (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 24, paddingBottom: 4 }}>
          {memory.photos.map((p) => (
            p.mediaType === 'video' ? (
              <video
                key={p.id}
                src={p.url}
                poster={p.posterUrl ?? undefined}
                controls
                playsInline
                preload="metadata"
                style={{ height: 120, width: 'auto', borderRadius: 12, border: '1px solid var(--border)', flexShrink: 0, background: '#000' }}
              />
            ) : (
              <img
                key={p.id}
                src={p.url}
                alt=""
                loading="lazy"
                style={{ height: 120, width: 'auto', borderRadius: 12, border: '1px solid var(--border)', flexShrink: 0 }}
              />
            )
          ))}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={resonateBusy}
          onClick={() => void toggleResonate()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            minHeight: 'var(--margo-touch-min)',
            padding: '0 16px',
            borderRadius: 999,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: memory.viewerResonated ? 'var(--gold)' : 'var(--text-secondary)',
            fontFamily: font,
            fontSize: TYPE.label,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          {memory.viewerResonated ? <FeedIconHeartFilled size={18} /> : <FeedIconHeart size={18} />}
          Resonate {memory.resonateCount > 0 ? memory.resonateCount : ''}
        </button>
        <button
          type="button"
          onClick={() => setCardOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            minHeight: 'var(--margo-touch-min)',
            padding: '0 16px',
            borderRadius: 999,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-secondary)',
            fontFamily: font,
            fontSize: TYPE.label,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          <CardIcon size={18} color="var(--text-secondary)" />
          Card
        </button>
      </div>

      <form onSubmit={(e) => void submitLyricBack(e)} style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontFamily: font, fontSize: TYPE.label, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Lyric back
        </label>
        <textarea
          value={lyricBackText}
          onChange={(e) => setLyricBackText(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="Reply with a lyric"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
            color: 'var(--text)',
            fontFamily: font,
            fontSize: TYPE.secondary,
            padding: 12,
            marginBottom: 10,
            resize: 'vertical',
          }}
        />
        <button
          type="submit"
          disabled={lyricBackBusy || !lyricBackText.trim()}
          style={{
            minHeight: 'var(--margo-touch-min)',
            padding: '0 20px',
            borderRadius: 999,
            border: 'none',
            background: 'var(--gold)',
            color: 'var(--bg)',
            fontFamily: font,
            fontSize: TYPE.label,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            opacity: lyricBackText.trim() ? 1 : 0.5,
          }}
        >
          {lyricBackBusy ? 'Posting…' : 'Post'}
        </button>
      </form>

      <CardExportModal
        open={cardOpen}
        onOpenChange={setCardOpen}
        lyric={story || memory.title}
        song={firstSong?.songTitle || ''}
        artist={firstSong?.artistName || ''}
        artwork={firstSong?.artworkUrl ?? memory.coverUrl}
      />
    </article>
  )
}
