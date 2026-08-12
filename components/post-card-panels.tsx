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
  node: ReactNode
}

/**
 * Stories-style full-width pages on Feed PostCards.
 * Height is CSS grid max (one row); peek is none; dots are the cue.
 */
export function PostCardPanels({
  post,
  actions,
  children,
}: {
  post: Post
  /** Action row — Lyric panel only. */
  actions: ReactNode
  children: ReactNode
}) {
  const { requireAuth } = useAuthGate()
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState(0)

  const audioUrl = post.audioUrl || null
  const coverSrc = post.youtubeMeta?.thumbnail || post.knowledge?.artwork || null
  const linkItems = useMemo(
    () => collectStreamingLinkItems(post.streamingLinks, post.youtubeMeta?.youtubeUrl),
    [post.streamingLinks, post.youtubeMeta?.youtubeUrl],
  )

  const panels: PanelSpec[] = useMemo(() => {
    const list: PanelSpec[] = [
      {
        id: 'lyric',
        node: (
          <div>
            {children}
            {actions}
          </div>
        ),
      },
    ]

    if (audioUrl) {
      list.push({
        id: 'player',
        node: (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '12px',
            flex: 1,
            minHeight: 0,
            width: '100%',
          }}>
            {coverSrc ? (
              <div style={{
                flex: '1 1 0',
                minHeight: 0,
                maxHeight: '180px',
                borderRadius: '12px',
                overflow: 'hidden',
              }}>
                <PostThumbnail
                  youtubeThumbnail={post.youtubeMeta?.thumbnail}
                  artwork={post.knowledge?.artwork}
                  alt=""
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            ) : null}
            <div style={{ flex: '0 0 auto' }}>
              <Tier1Player
                audioUrl={audioUrl}
                songId={post.songId || null}
                postText={post.text}
                title={post.knowledge?.song || ''}
                artist={post.knowledge?.artist || ''}
                artwork={post.knowledge?.artwork ?? null}
                reserveLineSlot
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
                    marginTop: '12px',
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
          </div>
        ),
      })
    }

    if (linkItems.length > 0) {
      list.push({
        id: 'links',
        node: (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px', flex: 1 }}>
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
        ),
      })
    }

    return list
  }, [actions, audioUrl, children, coverSrc, linkItems, post.knowledge?.artist, post.knowledge?.artwork, post.knowledge?.song, post.songId, post.text, post.youtubeMeta?.thumbnail, requireAuth])

  const onScroll = useCallback(() => {
    const el = scrollerRef.current
    if (!el || panels.length <= 1) return
    const w = el.clientWidth
    if (w <= 0) return
    const idx = Math.max(0, Math.min(panels.length - 1, Math.round(el.scrollLeft / w)))
    setActive(idx)
  }, [panels.length])

  useEffect(() => {
    setActive(0)
    const el = scrollerRef.current
    if (el) el.scrollLeft = 0
  }, [post.id, panels.length])

  if (panels.length <= 1) {
    return (
      <>
        {children}
        {actions}
      </>
    )
  }

  return (
    <div data-no-card-nav>
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
