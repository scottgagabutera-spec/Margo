'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import type { Post } from '@/hooks/usePosts'
import { PostThumbnail } from '@/components/post-thumbnail'
import { Tier1Player } from '@/components/tier1-player'
import { ChevronRightIcon } from '@/components/icons'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { collectStreamingLinkItems } from '@/lib/song-streaming-links'
import { UI_FONT, LYRIC_FONT } from '@/lib/fonts'

type PanelSpec = {
  id: string
  label: string
  node: ReactNode
}

const PEEK_PX = 28

function PanelLabel({ children }: { children: ReactNode }) {
  return (
    <p style={{
      margin: '0 0 10px',
      fontFamily: UI_FONT,
      fontSize: '0.55rem',
      fontWeight: 700,
      letterSpacing: '1.2px',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
    }}>
      {children}
    </p>
  )
}

/**
 * Experimental N-panel swipe strip for feed PostCards.
 * Panel 1 = today's lyric body; other panels opt in when data exists.
 */
export function PostCardPanels({
  post,
  children,
}: {
  post: Post
  /** Lyric panel body (PostMomentBody) — unchanged default view. */
  children: ReactNode
}) {
  const { requireAuth } = useAuthGate()
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState(0)

  const coverSrc = post.youtubeMeta?.thumbnail || post.knowledge?.artwork || null
  const audioUrl = post.audioUrl || null
  const linkItems = useMemo(
    () => collectStreamingLinkItems(post.streamingLinks, post.youtubeMeta?.youtubeUrl),
    [post.streamingLinks, post.youtubeMeta?.youtubeUrl],
  )

  const panels: PanelSpec[] = useMemo(() => {
    const list: PanelSpec[] = [
      { id: 'lyric', label: 'Lyric', node: children },
    ]

    if (coverSrc) {
      list.push({
        id: 'cover',
        label: 'Cover',
        node: (
          <div>
            <PanelLabel>Cover</PanelLabel>
            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <PostThumbnail
                youtubeThumbnail={post.youtubeMeta?.thumbnail}
                artwork={post.knowledge?.artwork}
                alt=""
                loading="lazy"
                style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
              />
            </div>
          </div>
        ),
      })
    }

    if (audioUrl) {
      list.push({
        id: 'player',
        label: 'Play',
        node: (
          <div>
            <PanelLabel>Full track</PanelLabel>
            <Tier1Player
              audioUrl={audioUrl}
              songId={post.songId || null}
              postText={post.text}
              title={post.knowledge?.song || ''}
              artist={post.knowledge?.artist || ''}
              artwork={post.knowledge?.artwork ?? null}
            />
            {post.songId ? (
              <Link
                href={`/song/${post.songId}`}
                aria-label="Full Karaoke"
                onClick={(e) => { if (!requireAuth()) e.preventDefault() }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '14px',
                  minHeight: 'var(--margo-touch-min)',
                  boxSizing: 'border-box',
                  fontFamily: LYRIC_FONT,
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  color: 'var(--gold)',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  padding: '0 14px',
                  border: '1px solid var(--gold-border)',
                  borderRadius: '50px',
                }}
              >
                Full Karaoke
                <ChevronRightIcon size={12} color="var(--gold)" />
              </Link>
            ) : null}
          </div>
        ),
      })
    }

    if (linkItems.length > 0) {
      list.push({
        id: 'links',
        label: 'Listen',
        node: (
          <div>
            <PanelLabel>Listen on</PanelLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {linkItems.map((item) => (
                <a
                  key={item.id + item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: 'var(--margo-touch-min)',
                    padding: '0 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'rgba(255,255,255,0.03)',
                    color: 'var(--text)',
                    textDecoration: 'none',
                    fontFamily: UI_FONT,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                  <ChevronRightIcon size={14} color="var(--text-muted)" />
                </a>
              ))}
            </div>
          </div>
        ),
      })
    }

    return list
  }, [audioUrl, children, coverSrc, linkItems, post.knowledge?.artist, post.knowledge?.artwork, post.knowledge?.song, post.songId, post.text, post.youtubeMeta?.thumbnail, requireAuth])

  const onScroll = useCallback(() => {
    const el = scrollerRef.current
    if (!el || panels.length <= 1) return
    const panelW = el.clientWidth - PEEK_PX
    if (panelW <= 0) return
    const idx = Math.max(0, Math.min(panels.length - 1, Math.round(el.scrollLeft / panelW)))
    setActive(idx)
  }, [panels.length])

  useEffect(() => {
    setActive(0)
    const el = scrollerRef.current
    if (el) el.scrollLeft = 0
  }, [post.id, panels.length])

  // Single panel — no chrome (lyric-only posts stay unchanged).
  if (panels.length <= 1) {
    return <>{children}</>
  }

  return (
    <div data-no-card-nav style={{ marginBottom: '4px' }}>
      <div
        ref={scrollerRef}
        className="row-scroll margo-post-panel-row"
        data-margo-swipe-exclude
        onScroll={onScroll}
      >
        {panels.map((panel) => (
          <div
            key={panel.id}
            className="margo-post-panel"
            data-panel={panel.id}
            style={{ scrollSnapAlign: 'start' }}
          >
            {panel.node}
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          marginTop: '10px',
          minHeight: '20px',
        }}
        aria-hidden
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {panels.map((p, i) => (
            <span
              key={p.id}
              style={{
                width: i === active ? '14px' : '6px',
                height: '6px',
                borderRadius: '50px',
                background: i === active ? 'var(--gold)' : 'rgba(255,255,255,0.22)',
                transition: 'width 160ms ease, background 160ms ease',
              }}
            />
          ))}
        </div>
        <span style={{
          fontFamily: UI_FONT,
          fontSize: '0.55rem',
          fontWeight: 600,
          letterSpacing: '0.6px',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
        }}>
          {active + 1} / {panels.length}
        </span>
      </div>
    </div>
  )
}
