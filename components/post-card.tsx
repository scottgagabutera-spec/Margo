'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRightIcon, EditIcon } from '@/components/icons'
import {
  FeedIconCard,
  FeedIconHeart,
  FeedIconHeartFilled,
  FeedIconLyricBack,
  FeedIconMore,
  FeedIconReplay,
} from '@/components/feed-card-icons'
import { fetchLyricBackSuggestionsForPost } from '@/lib/lyric-back-suggestions'
import type { Post } from '@/hooks/usePosts'
import { EditMomentModal } from '@/components/edit-moment-modal'
import { DeleteMomentDialog } from '@/components/delete-moment-dialog'
import { warmUrl } from '@/lib/audio-engine'
import { resolveExternalListenUrl } from '@/lib/moment/listen'
import {
  computePlaybackSegments,
  postLinesToSegmentInput,
} from '@/lib/moment/playback-segments'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { persistActivePrimaryScroll } from '@/components/primary-tab-shell'
import { useDismissibleLayer } from '@/hooks/useDismissibleLayer'
import { UsernameTag } from '@/components/username-tag'
import { PendingNavLink } from '@/components/pending-nav-link'
import { useStoryRingContext } from '@/components/stories/story-ring-context'
import { StoryAvatarRing } from '@/components/stories/story-avatar-ring'
import { RelativeTime } from '@/components/relative-time'
import { useAuthorProfile } from '@/hooks/useAuthorProfile'
import { createClient } from '@/lib/supabase/client'
import { useIdentity } from '@/hooks/useIdentity'
import { UI_FONT, LYRIC_FONT, FEED_TYPE } from '@/lib/fonts'
import { getVibeTheme, vibeThemeStyleVars } from '@/lib/vibe-theme'
import { formatEchoBadge } from '@/lib/post-card-lyric-layout'
import { FEED_CARD_LYRIC_ROW_CLASS } from '@/lib/post-card-lyric-class'
import { FEED_HUE_GLYPH } from '@/lib/feed-vibe-map'
import { FeedVibeGlyph } from '@/components/feed-vibe-glyph'
import { PostCardLyricSection, PostCardSongSection } from '@/components/post-card-feed-layout'
import { resolveMomentLines } from '@/lib/post-lines'
import { PostCardSuggestedReply } from '@/components/post-card-suggested-reply'
import { SongMeta } from '@/components/song-meta'

const supabase = createClient()

export type PostCardVariant = 'feed' | 'compact' | 'row'

const REPORT_REASONS = ['Spam', 'Harassment', 'Inappropriate', 'Other'] as const

function isLyricBackAllowed(post: Post): boolean {
  return (post.status ?? 'active') === 'active'
}

const primaryLyricBackBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  minHeight: 'var(--margo-touch-min)',
  fontFamily: 'var(--font-lora), serif',
  fontSize: '0.6rem',
  fontWeight: 700,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: 'var(--bg)',
  background: 'var(--gold)',
  borderRadius: '50px',
  textDecoration: 'none',
  marginBottom: '12px',
  boxSizing: 'border-box',
}

export interface PostCardProps {
  post: Post
  resonated: boolean
  resonateCount: number
  echoCount: number
  onResonate: (id: string) => void
  onExport: (post: Post) => void
  /** feed-only ranking badges; ignored when variant is compact */
  isNew?: boolean
  isTrending?: boolean
  isTop?: boolean
  onSelectVibe?: (vibe: string) => void
  onSelectRank?: (rank: 'NEW' | 'TRENDING' | 'TOP') => void
  variant?: PostCardVariant
  replayed?: boolean
  replayCount?: number
  onReplay?: (id: string) => void
  onQuoteReplay?: (id: string, quoteText: string) => void
  /** When true, skip whole-card navigate (e.g. already on /post/[id]). */
  disableCardNav?: boolean
  /** Post thread header on /post/[id] — primary Lyric Back CTA layout. */
  threadDetail?: boolean
  /** Optional DOM id for scroll/highlight (e.g. feed-post-{id}). */
  domId?: string
  /** Brief highlight after the user just published this Moment. */
  highlightShared?: boolean
}

const VIBE_LABELS: Record<string, string> = {
  love: 'Love', heartbreak: 'Pain', pain: 'Pain', hope: 'Hope', nostalgia: 'Nostalgia',
  healing: 'Healing', joy: 'Joy', rage: 'Rage', loneliness: 'Loneliness',
  sendit: 'Send It', letout: 'Let Out', hype: 'Hype', chill: 'Chill', proud: 'Proud',
  grateful: 'Grateful', spiritual: 'Spiritual',
}

export function normalizeEmotion(e: string) {
  if (!e) return ''
  return e.replace(/send.?it/i, 'SENDIT').replace(/let.?out/i, 'LETOUT')
    .replace('SendIt', 'SENDIT').replace('LetOut', 'LETOUT')
    .replace('SEND IT', 'SENDIT').replace('LET OUT', 'LETOUT')
    .toUpperCase()
}

function PostMomentBody({ post }: { post: Post }) {
  return (
    <div className="margo-post-card__body">
      <PostCardLyricSection post={post} />
      <PostCardSongSection post={post} showMomentControls />
    </div>
  )
}

// ── Earned tag pill — only rendered when a post actually qualifies ────
function EarnedTag({ label, onClick }: { label: 'New' | 'Trending' | 'Top'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      style={{
        fontFamily: UI_FONT,
        fontSize: `var(${FEED_TYPE.sectionLabel})`,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        padding: '0 2px',
        minHeight: 'var(--margo-touch-min)',
        borderRadius: 0, background: 'none',
        border: 'none', color: 'var(--text-muted)',
        cursor: 'pointer', flexShrink: 0,
      }}
    >{label}</button>
  )
}

export function PostCard({
  post, resonated, resonateCount, echoCount, onResonate, onExport,
  isNew = false, isTrending = false, isTop = false, onSelectVibe, onSelectRank,
  variant = 'feed',
  replayed = false, replayCount = 0, onReplay, onQuoteReplay,
  disableCardNav = false,
  threadDetail = false,
  domId,
  highlightShared = false,
}: PostCardProps) {
  const router = useRouter()
  const { requireAuth } = useAuthGate()
  const { user } = useIdentity()
  const storyRing = useStoryRingContext()
  const authorProfile = useAuthorProfile(post.authorUid || null)
  const viewedRef = useRef(false)
  const emotion = normalizeEmotion(post.emotion || '').toLowerCase()
  const label = VIBE_LABELS[emotion] || post.emotion || ''
  const echoBadge = formatEchoBadge(echoCount)
  const isTier1 = !!(post.songId && post.audioUrl)
  const audioUrl = post.audioUrl || null
  const cardRef = useRef<HTMLDivElement>(null)
  const isOwner = !!user?.id && !!post.authorUid && post.authorUid === user.id
  const lyricBackAllowed = isLyricBackAllowed(post)
  const lyricBackHref = `/lyric-back?postId=${post.id}`
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletedLocally, setDeletedLocally] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportBusy, setReportBusy] = useState(false)
  const [reportMsg, setReportMsg] = useState<string | null>(null)
  const [replayMenuOpen, setReplayMenuOpen] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteText, setQuoteText] = useState('')
  const replayWrapRef = useRef<HTMLDivElement>(null)
  const moreWrapRef = useRef<HTMLDivElement>(null)
  const [rowExpanded, setRowExpanded] = useState(false)
  const [avatarBroken, setAvatarBroken] = useState(false)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [suggestCount, setSuggestCount] = useState<number | null>(null)
  useEffect(() => { setAvatarBroken(false) }, [post.authorAvatarUrl, post.authorUid])
  const closeReplayMenu = useCallback(() => {
    setReplayMenuOpen(false)
    setQuoteOpen(false)
    setQuoteText('')
  }, [])
  const closeMoreMenu = useCallback(() => {
    setMenuOpen(false)
    setReportOpen(false)
    setReportMsg(null)
  }, [])
  useDismissibleLayer(replayMenuOpen, closeReplayMenu, replayWrapRef)
  useDismissibleLayer(menuOpen, closeMoreMenu, moreWrapRef)
  // row collapses to a dense one-liner; expand renders the compact card in place
  const isRow = variant === 'row'
  const isCompact = variant === 'compact' || (isRow && rowExpanded)
  const avatarPx = isCompact ? '32px' : '36px'

  const lines = resolveMomentLines(post)
  const vibeTheme = getVibeTheme(emotion || post.emotion)
  const catalogLines = lines.filter(
    (line) => line.source !== 'external' && !!(line.songId && line.audioUrl),
  )
  const playbackSegmentsKey = catalogLines
    .map((l) => `${l.id ?? ''}|${l.songId ?? ''}|${l.snippetStart ?? ''}|${l.snippetEnd ?? ''}`)
    .join(';')
  const playbackSegments = useMemo(
    () => computePlaybackSegments(postLinesToSegmentInput(catalogLines)),
    [playbackSegmentsKey],
  )
  const snippetWarmSec = playbackSegments[0]?.startSec ?? post.snippetStart ?? 0
  const firstLine = lines[0]
  const externalCardLayout = catalogLines.length === 0 && lines.length > 0 && !!resolveExternalListenUrl({
    songTitle: firstLine?.songTitle || post.knowledge?.song,
    artistName: firstLine?.artistName || post.knowledge?.artist,
    youtubeUrl: post.youtubeMeta?.youtubeUrl,
  })
  useEffect(() => {
    if (!audioUrl || !isTier1) return
    const el = cardRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          warmUrl(audioUrl, snippetWarmSec)
          for (let i = 1; i < playbackSegments.length; i++) {
            warmUrl(audioUrl, playbackSegments[i].startSec)
          }
        }
      },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [audioUrl, isTier1, snippetWarmSec, playbackSegments])

  useEffect(() => {
    if (viewedRef.current) return
    const el = cardRef.current
    if (!el) return
    const sessionKey = `viewed_${post.id}`
    try { if (sessionStorage.getItem(sessionKey)) return } catch {}
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          viewedRef.current = true
          obs.disconnect()
          try { sessionStorage.setItem(sessionKey, '1') } catch {}
          supabase.rpc('increment_post_view', { p_post_id: post.id }).then(({ error }) => {
            if (error) console.error('Failed to record view:', error)
          })
        }
      },
      { threshold: 0.5 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [post.id])

  useEffect(() => {
    if (!lyricBackAllowed || suggestCount !== null) return
    const el = cardRef.current
    if (!el) return
    const cacheKey = `margo-lb-suggest-count:${post.id}`
    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached !== null) {
        setSuggestCount(Number(cached))
        return
      }
    } catch { /* ignore */ }
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        obs.disconnect()
        void fetchLyricBackSuggestionsForPost(post.id)
          .then((list) => {
            setSuggestCount(list.length)
            try { sessionStorage.setItem(cacheKey, String(list.length)) } catch { /* ignore */ }
          })
          .catch(() => setSuggestCount(0))
      },
      { threshold: 0.25 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [post.id, lyricBackAllowed, suggestCount])

  const rawAvatarUrl = (post.authorAvatarUrl || authorProfile?.avatarUrl || '').trim()
  const avatarUrl = rawAvatarUrl && !avatarBroken ? rawAvatarUrl : null

  // Optimistic — the server delete already succeeded by the time this is
  // set. Other open surfaces reconcile via their own Realtime subscription
  // (usePosts/useEchoes already listen for postgres_changes on posts).
  if (deletedLocally) {
    return null
  }

  if (isRow && !rowExpanded) {
    return (
      <button
        type="button"
        onClick={() => setRowExpanded(true)}
        aria-label="Expand lyric"
        style={{
          display: 'block', width: '100%', textAlign: 'left', boxSizing: 'border-box',
          background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)',
          padding: '12px 4px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          minHeight: 'var(--margo-touch-min)',
        }}
      >
        <p className={FEED_CARD_LYRIC_ROW_CLASS}>
          {post.text || 'Untitled lyric'}
        </p>
        {(post.knowledge?.song || post.knowledge?.artist) ? (
          <div style={{ marginTop: '4px' }}>
            <SongMeta
              title={post.knowledge?.song}
              artist={post.knowledge?.artist}
              aiGenerated={post.isAiGenerated}
              titleStyle={{ fontSize: `var(${FEED_TYPE.songTitle})`, fontWeight: 600 }}
              artistStyle={{ fontSize: `var(${FEED_TYPE.artist})` }}
            />
          </div>
        ) : null}
      </button>
    )
  }

  const goToPost = (e: React.MouseEvent) => {
    if (disableCardNav || isRow) return
    const t = e.target as HTMLElement | null
    if (t?.closest?.('a, button, textarea, input, [data-no-card-nav]')) return
    persistActivePrimaryScroll()
    router.push('/post/' + post.id)
  }

  return (
    <div
      id={domId}
      ref={cardRef}
      className={[
        'margo-post-card',
        isTier1 ? 'margo-post-card--tier1' : '',
        externalCardLayout ? 'margo-post-card--external' : '',
        highlightShared ? 'margo-feed-post--shared' : '',
      ].filter(Boolean).join(' ')}
      onClick={goToPost}
      onPointerDown={() => {
        if (!disableCardNav && !isRow) persistActivePrimaryScroll()
      }}
      style={{
        ...vibeThemeStyleVars(vibeTheme),
        ...(isTier1 ? { borderColor: 'var(--gold-border)' } : null),
        position: 'relative', overflow: 'visible',
        isolation: 'isolate',
        cursor: disableCardNav || isRow ? 'default' : 'pointer',
        ...(isRow ? { margin: '6px 0 10px' } : null),
      }}
    >
      {isRow && (
        <button
          type="button"
          onClick={() => setRowExpanded(false)}
          aria-label="Collapse lyric"
          style={{
            position: 'absolute', top: '8px', right: '8px', zIndex: 2,
            width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: 0, WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ display: 'inline-flex', transform: 'rotate(-90deg)' }}>
            <ChevronRightIcon size={14} color="var(--text-muted)" />
          </span>
        </button>
      )}
      <div className="margo-post-card__header">
        {(() => {
          const profileUsername = (authorProfile?.username || post.username || '').replace(/^@/, '')
          const profileHref = profileUsername ? `/profile/${profileUsername}` : null
          const authorProfileId = post.authorUid || null
          const storyAuthor = authorProfileId && storyRing?.hasActiveStory(authorProfileId)
            ? storyRing.getStoryAuthor(authorProfileId)
            : null
          const displayLabel = storyAuthor?.displayName || authorProfile?.displayName || post.username || 'profile'
          const timeNode = post.timestamp != null ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: `var(${FEED_TYPE.date})` }} aria-hidden>·</span>
              <RelativeTime
                date={post.timestamp}
                variant="long"
                style={{
                  fontFamily: UI_FONT,
                  fontSize: `var(${FEED_TYPE.date})`,
                  color: 'var(--text-muted)',
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                }}
              />
            </span>
          ) : null
          const avatarInitial = post.username ? post.username.charAt(0).toUpperCase() : (isTier1 ? 'M' : 'ML')
          const avatarInner = avatarUrl ? (
            <img src={avatarUrl} alt="" onError={() => setAvatarBroken(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{
              fontFamily: UI_FONT,
              fontSize: `var(${FEED_TYPE.handle})`,
              fontWeight: 700,
              color: isTier1 ? 'var(--bg)' : 'var(--gold)',
            }}>
              {avatarInitial}
            </span>
          )
          const avatarShellStyle: React.CSSProperties = {
            width: avatarPx,
            height: avatarPx,
            borderRadius: '50%',
            flexShrink: 0,
            background: avatarUrl
              ? 'none'
              : isTier1 ? 'var(--gold)' : 'linear-gradient(135deg, rgba(232,197,71,0.3), rgba(232,197,71,0.1))',
            border: avatarUrl
              ? '1px solid rgba(255,255,255,0.08)'
              : isTier1 ? 'none' : '1px solid rgba(232,197,71,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }
          const avatarPxNum = isCompact ? 32 : 36
          const avatarCore = storyAuthor ? (
            <StoryAvatarRing size={avatarPxNum} hasUnseen={storyAuthor.hasUnseen}>
              {avatarInner}
            </StoryAvatarRing>
          ) : (
            <div style={avatarShellStyle}>{avatarInner}</div>
          )
          const avatarControl = storyAuthor && storyRing && authorProfileId ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                storyRing.openStory(authorProfileId)
              }}
              onPointerDown={() => storyRing.warmStory(authorProfileId)}
              aria-label={
                storyAuthor.hasUnseen
                  ? `View ${displayLabel}'s new Story`
                  : `View ${displayLabel}'s Story`
              }
              title="View Story"
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                margin: 0,
                cursor: 'pointer',
                flexShrink: 0,
                WebkitTapHighlightColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 'var(--margo-touch-min)',
                minHeight: 'var(--margo-touch-min)',
                position: 'relative',
              }}
            >
              {avatarCore}
              <span aria-hidden style={{
                position: 'absolute',
                right: storyAuthor.hasUnseen ? 2 : 4,
                bottom: storyAuthor.hasUnseen ? 2 : 4,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--gold)',
                border: '1.5px solid var(--bg)',
                boxShadow: '0 0 6px rgba(232,197,71,0.55)',
              }} />
            </button>
          ) : profileHref ? (
            <PendingNavLink
              href={profileHref}
              indicator="overlay"
              ringSize={20}
              onClick={(e) => e.stopPropagation()}
              aria-label={`View profile @${profileUsername}`}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 'var(--margo-touch-min)',
                minHeight: 'var(--margo-touch-min)',
                WebkitTapHighlightColor: 'transparent',
                borderRadius: '50%',
              }}
            >
              {avatarCore}
            </PendingNavLink>
          ) : (
            avatarCore
          )
          const nameBlock = (
            <div style={{ minWidth: 0, flex: 1 }}>
              <UsernameTag
                authorUid={post.authorUid || null}
                fallbackName={post.username}
                linkProfile={false}
                layout="stacked"
                size={isCompact ? 'compact' : 'default'}
                metaAfterHandle={timeNode}
              />
            </div>
          )
          return (
            <>
              <div style={{ gridRow: '1 / span 2' }}>{avatarControl}</div>
              <div style={{ minWidth: 0, gridColumn: 2 }}>
                {profileHref ? (
                  <PendingNavLink
                    href={profileHref}
                    indicator="overlay"
                    ringSize={22}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`View profile @${profileUsername}`}
                    style={{
                      minWidth: 0,
                      textDecoration: 'none',
                      color: 'inherit',
                      WebkitTapHighlightColor: 'transparent',
                      display: 'block',
                      borderRadius: '8px',
                    }}
                  >
                    {nameBlock}
                  </PendingNavLink>
                ) : (
                  nameBlock
                )}
              </div>
            </>
          )
        })()}
        {label && !isRow ? (
          <button
            type="button"
            className="margo-post-card__mood"
            data-no-card-nav
            aria-label={`Vibe: ${label}`}
            onClick={(e) => {
              e.stopPropagation()
              onSelectVibe?.(emotion.toUpperCase())
            }}
          >
            <FeedVibeGlyph id={FEED_HUE_GLYPH[vibeTheme.hue]} size={12} />
            <span className="margo-post-card__mood-label">{label}</span>
          </button>
        ) : null}
        <div className="margo-post-card__header-tools">
          {variant === 'feed' && (isNew || isTrending || isTop) && (
            <div style={{ display: 'flex', gap: '6px' }}>
              {isTop && <EarnedTag label="Top" onClick={() => onSelectRank?.('TOP')} />}
              {isTrending && !isTop && <EarnedTag label="Trending" onClick={() => onSelectRank?.('TRENDING')} />}
              {isNew && !isTop && !isTrending && <EarnedTag label="New" onClick={() => onSelectRank?.('NEW')} />}
            </div>
          )}
          {isOwner && (
            <button
              type="button"
              className="margo-post-card__icon-btn"
              aria-label="Edit Moment"
              onClick={(e) => { e.stopPropagation(); setEditOpen(true) }}
            >
              <EditIcon size={20} color="currentColor" />
            </button>
          )}
          <div ref={moreWrapRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="margo-post-card__icon-btn"
              aria-label="More actions"
              aria-expanded={menuOpen}
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen(o => !o)
                setReportOpen(false)
                setReportMsg(null)
              }}
            >
              <FeedIconMore size={20} />
            </button>
            {menuOpen && !reportOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '6px', zIndex: 20,
                  minWidth: '160px', background: 'var(--bg)',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
                  padding: '6px', boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                }}
              >
                {!isOwner && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      if (!requireAuth()) return
                      setReportOpen(true)
                    }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '12px 14px', minHeight: '44px', background: 'none', border: 'none',
                      color: 'var(--text)', fontFamily: UI_FONT, fontSize: '0.7rem',
                      cursor: 'pointer', borderRadius: '8px',
                    }}
                  >Report</button>
                )}
                {isOwner && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); setDeleteOpen(true) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '12px 14px', minHeight: '44px', background: 'none', border: 'none',
                      color: 'var(--text-secondary)', fontFamily: UI_FONT, fontSize: '0.7rem',
                      cursor: 'pointer', borderRadius: '8px',
                    }}
                  >Delete</button>
                )}
                {reportMsg && (
                  <p style={{
                    margin: '6px 4px 0', fontFamily: 'var(--font-lora), serif',
                    fontSize: '0.72rem', color: '#ff6060',
                  }}>{reportMsg}</p>
                )}
              </div>
            )}
            {menuOpen && reportOpen && (
              <div
                style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '6px', zIndex: 20,
                  minWidth: '200px', background: 'var(--bg)',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
                  padding: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                }}
              >
                <p style={{
                  fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', fontWeight: 700,
                  letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)',
                  margin: '0 0 8px',
                }}>Why report?</p>
                {REPORT_REASONS.map(reason => (
                  <button
                    key={reason}
                    type="button"
                    disabled={reportBusy}
                    onClick={async () => {
                      if (!user?.id || reportBusy) return
                      setReportBusy(true)
                      setReportMsg(null)
                      const { error } = await supabase.from('post_reports').insert({
                        post_id: post.id,
                        reporter_id: user.id,
                        reason,
                      })
                      setReportBusy(false)
                      if (error) {
                        const msg = String(error.message || '')
                        setReportMsg(msg.toLowerCase().includes('duplicate') || msg.includes('unique')
                          ? 'Already reported.'
                          : error.message)
                        return
                      }
                      setReportMsg('Thanks — we received your report.')
                      setTimeout(() => { setMenuOpen(false); setReportOpen(false); setReportMsg(null) }, 1200)
                    }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '10px 12px', minHeight: '44px', background: 'none', border: 'none',
                      color: 'var(--text)', fontFamily: UI_FONT, fontSize: '0.7rem',
                      cursor: reportBusy ? 'not-allowed' : 'pointer', borderRadius: '8px',
                    }}
                  >{reason}</button>
                ))}
                {reportMsg && (
                  <p style={{
                    margin: '6px 4px 0', fontFamily: 'var(--font-lora), serif',
                    fontSize: '0.72rem', color: 'var(--gold)',
                  }}>{reportMsg}</p>
                )}
                <button
                  type="button"
                  onClick={() => { setReportOpen(false); setReportMsg(null) }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '10px 12px', minHeight: '44px', background: 'none', border: 'none',
                    color: 'var(--text-muted)', fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >Back</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isOwner && (
        <EditMomentModal
          open={editOpen}
          onOpenChange={setEditOpen}
          postId={post.id}
          lines={resolveMomentLines(post)}
          echoCount={echoCount}
        />
      )}
      {isOwner && (
        <DeleteMomentDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          postId={post.id}
          onDeleted={() => setDeletedLocally(true)}
        />
      )}

      <PostMomentBody post={post} />

      {lyricBackAllowed ? (
        <PostCardSuggestedReply
          postId={post.id}
          open={suggestionsOpen}
          onClose={() => setSuggestionsOpen(false)}
          onWriteOwn={() => {
            if (!requireAuth()) return
            persistActivePrimaryScroll()
            router.push(lyricBackHref)
          }}
          onAcceptSuggested={(s) => {
            if (!requireAuth()) return
            const q = new URLSearchParams({
              postId: post.id,
              lyric: s.text,
              song: s.songTitle,
              artist: s.artistName,
              songId: s.songId,
              start: String(s.startSec),
              end: String(s.endSec),
            })
            if (s.artworkUrl) q.set('artwork', s.artworkUrl)
            if (s.audioUrl) q.set('audioUrl', s.audioUrl)
            persistActivePrimaryScroll()
            router.push(`/lyric-back?${q.toString()}`)
          }}
          onOpenSuggestedSearch={() => {
            if (!requireAuth()) return
            persistActivePrimaryScroll()
            router.push(`/lyric-back?postId=${encodeURIComponent(post.id)}&catalogOnly=1`)
          }}
        />
      ) : null}

      {threadDetail && lyricBackAllowed ? (
        <PendingNavLink
          href={lyricBackHref}
          style={primaryLyricBackBtnStyle}
        >
          Lyric Back
        </PendingNavLink>
      ) : null}

      <div data-no-card-nav>
      <div className={(() => {
        const actionCount = 2 + (!threadDetail && lyricBackAllowed ? 1 : 0) + (onReplay ? 1 : 0)
        const cols = actionCount === 3 ? ' margo-feed-actions--cols-3' : ''
        return `margo-feed-actions${cols}`
      })()}>
        <button
          type="button"
          className="margo-feed-action"
          aria-label={resonated ? 'Remove resonate' : 'Resonate'}
          onClick={(e) => { e.stopPropagation(); onResonate(post.id) }}
          style={{ color: resonated ? 'var(--gold)' : 'var(--text-secondary)' }}
        >
          <span className="margo-feed-action__icon-wrap">
            {resonated
              ? <FeedIconHeartFilled size={20} />
              : <FeedIconHeart size={20} />
            }
            {resonateCount > 0 ? (
              <span className="margo-feed-action__badge">{resonateCount}</span>
            ) : null}
          </span>
          <span className="margo-feed-action__label">Resonate</span>
        </button>

        {!threadDetail && lyricBackAllowed ? (
          suggestCount !== null && suggestCount > 0 ? (
            <button
              type="button"
              className="margo-feed-action"
              aria-label={suggestionsOpen ? 'Hide Lyric Back suggestions' : 'Show Lyric Back suggestions'}
              aria-expanded={suggestionsOpen}
              onClick={(e) => {
                e.stopPropagation()
                setSuggestionsOpen((o) => !o)
              }}
              style={{ color: suggestionsOpen ? 'var(--post-vibe-text)' : 'var(--text-secondary)' }}
            >
              <span className="margo-feed-action__icon-wrap">
                <FeedIconLyricBack size={20} />
                {echoBadge ? (
                  <span className="margo-feed-action__badge">{echoBadge}</span>
                ) : null}
                <span className="margo-feed-action__suggest-dot" aria-hidden />
              </span>
              <span className="margo-feed-action__label">Lyric Back</span>
            </button>
          ) : (
            <PendingNavLink
              href={lyricBackHref}
              className="margo-feed-action"
              aria-label="Lyric Back"
              indicator="tint"
              onClick={(e) => e.stopPropagation()}
              style={{ color: 'var(--text-secondary)' }}
            >
              <span className="margo-feed-action__icon-wrap">
                <FeedIconLyricBack size={20} />
                {echoBadge ? (
                  <span className="margo-feed-action__badge">{echoBadge}</span>
                ) : null}
              </span>
              <span className="margo-feed-action__label">Lyric Back</span>
            </PendingNavLink>
          )
        ) : null}

        <button
          type="button"
          className="margo-feed-action"
          aria-label="Export lyric card"
          onClick={(e) => { e.stopPropagation(); onExport(post) }}
          style={{ color: 'var(--text-secondary)' }}
        >
          <span className="margo-feed-action__icon-wrap">
            <FeedIconCard size={20} />
          </span>
          <span className="margo-feed-action__label">Card</span>
        </button>

        {onReplay ? (
        <div ref={replayWrapRef} style={{ position: 'relative', minWidth: 0 }}>
          <button
            type="button"
            className="margo-feed-action"
            aria-label={replayed ? 'Undo Replay' : 'Replay'}
            aria-expanded={replayMenuOpen}
            onClick={() => {
              setReplayMenuOpen(o => !o)
              setQuoteOpen(false)
              setQuoteText('')
            }}
            style={{
              width: '100%',
              color: replayed ? 'var(--gold)' : 'var(--text-secondary)',
              transition: 'color 150ms ease',
            }}
          >
            <span className="margo-feed-action__icon-wrap">
              <FeedIconReplay size={20} />
              {replayCount > 0 ? (
                <span className="margo-feed-action__badge">{replayCount}</span>
              ) : null}
            </span>
            <span className="margo-feed-action__label">Replay</span>
          </button>
          {replayMenuOpen && !quoteOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '6px', zIndex: 20,
                minWidth: '160px', background: 'var(--bg)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
                padding: '6px', boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
              }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (!requireAuth()) return
                  onReplay?.(post.id)
                  setReplayMenuOpen(false)
                }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 12px', minHeight: '44px', background: 'none', border: 'none',
                  color: 'var(--text)', fontFamily: UI_FONT, fontSize: '0.7rem',
                  cursor: 'pointer', borderRadius: '8px',
                }}
              >{replayed ? 'Undo Replay' : 'Replay'}</button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (!requireAuth()) return
                  setQuoteOpen(true)
                }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 12px', minHeight: '44px', background: 'none', border: 'none',
                  color: 'var(--text)', fontFamily: UI_FONT, fontSize: '0.7rem',
                  cursor: 'pointer', borderRadius: '8px',
                }}
              >Add your take</button>
            </div>
          )}
          {replayMenuOpen && quoteOpen && (
            <div
              style={{
                position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '6px', zIndex: 20,
                width: '220px', background: 'var(--bg)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
                padding: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
              }}
            >
              <textarea
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="Add your take…"
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box', resize: 'vertical',
                  fontFamily: LYRIC_FONT, fontSize: '0.82rem',
                  color: 'var(--text)', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
                  padding: '10px', outline: 'none', marginBottom: '8px',
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const text = quoteText.trim()
                    if (!text) return
                    if (!requireAuth()) return
                    onQuoteReplay?.(post.id, text)
                    setReplayMenuOpen(false)
                    setQuoteOpen(false)
                    setQuoteText('')
                  }}
                  style={{
                    flex: 1, minHeight: '44px', padding: '0 12px',
                    background: 'var(--gold)', border: 'none', borderRadius: '8px',
                    color: 'var(--bg)', fontFamily: UI_FONT,
                    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1px',
                    textTransform: 'uppercase', cursor: 'pointer',
                  }}
                >Submit</button>
                <button
                  type="button"
                  onClick={() => {
                    setQuoteOpen(false)
                    setQuoteText('')
                    setReplayMenuOpen(false)
                  }}
                  style={{
                    flex: 1, minHeight: '44px', padding: '0 12px',
                    background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
                    color: 'var(--text-muted)', fontFamily: UI_FONT,
                    fontSize: '0.65rem', cursor: 'pointer',
                  }}
                >Cancel</button>
              </div>
            </div>
          )}
        </div>
        ) : null}
      </div>

      </div>

    </div>
  )
}
