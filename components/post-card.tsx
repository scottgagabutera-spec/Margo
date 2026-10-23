'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRightIcon } from '@/components/icons'
import { RepostSheet } from '@/components/repost-sheet'
import type { Post } from '@/hooks/usePosts'
import { PostMomentInlineEdit } from '@/components/post-moment-inline-edit'
import { DeleteMomentDialog } from '@/components/delete-moment-dialog'
import { warmUrl } from '@/lib/audio-engine'
import { resolveExternalListenUrl } from '@/lib/moment/listen'
import {
  computePlaybackSegments,
  postLinesToSegmentInput,
} from '@/lib/moment/playback-segments'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { persistActivePrimaryScroll } from '@/components/primary-tab-shell'
import { navigateToPostThread } from '@/lib/post-thread-nav'
import { PostReportMenu } from '@/components/post-report-menu'
import { UsernameTag } from '@/components/username-tag'
import { PendingNavLink } from '@/components/pending-nav-link'
import { useStoryRingContext } from '@/components/stories/story-ring-context'
import { StoryAvatarRing } from '@/components/stories/story-avatar-ring'
import { RelativeTime } from '@/components/relative-time'
import { useAuthorProfile } from '@/hooks/useAuthorProfile'
import { createClient } from '@/lib/supabase/client'
import { useIdentity } from '@/hooks/useIdentity'
import { UI_FONT, FEED_TYPE } from '@/lib/fonts'
import { getVibeTheme, vibeThemeStyleVars } from '@/lib/vibe-theme'
import { FEED_CARD_LYRIC_ROW_CLASS } from '@/lib/post-card-lyric-class'
import { FEED_HUE_GLYPH } from '@/lib/feed-vibe-map'
import { FeedVibeGlyph } from '@/components/feed-vibe-glyph'
import { PostCardLyricSection, PostCardSongSection } from '@/components/post-card-feed-layout'
import { resolveMomentLines } from '@/lib/post-lines'
import { PostCardSuggestedReply } from '@/components/post-card-suggested-reply'
import { FeedPostActions } from '@/components/feed-post-actions'
import { echoToPost } from '@/lib/echo-to-post'
import { SongMeta } from '@/components/song-meta'
import { AtmosphereLayer } from '@/components/atmosphere-layer'

const supabase = createClient()

export type PostCardVariant = 'feed' | 'compact' | 'row'

function isLyricBackAllowed(post: Post): boolean {
  return (post.status ?? 'active') === 'active'
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
  onUndoReplay?: (id: string) => void
  /** Saved note on the signed-in user's row, shown in the preview. */
  replayNote?: string | null
  /** Lyric Back rows in this card. Falls back to the card's own flags when omitted. */
  echoReplayed?: (id: string) => boolean
  echoReplayCount?: (id: string) => number
  echoReplayNote?: (id: string) => string | null
  /** When true, skip whole-card navigate (e.g. already on /post/[id]). */
  disableCardNav?: boolean
  /** Post thread header on /post/[id] — action row only; page owns LB compose. */
  threadDetail?: boolean
  /** /post/[id]: parent controls inline compose open state. */
  threadLyricBackOpen?: boolean
  onThreadLyricBack?: () => void
  /** Optional DOM id for scroll/highlight (e.g. feed-post-{id}). */
  domId?: string
  /** Brief highlight after the user just published this Moment. */
  highlightShared?: boolean
  /** Repost preview renders the card without counting another feed impression. */
  recordImpression?: boolean
  /** One-shot: open Lyric Back panel (e.g. /feed?highlight=&openLb=1). */
  openLyricBack?: boolean
  onLyricBackPanelChange?: (open: boolean) => void
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

function PostMomentBody({
  post,
  atmosphereRooms,
}: {
  post: Post
  atmosphereRooms: { songId: string; lineText: string }[]
}) {
  return (
    <div className="margo-post-card__body">
      <div className="margo-post-card__moment-stage">
        {atmosphereRooms.length > 0 ? (
          <AtmosphereLayer variant="card" rooms={atmosphereRooms} />
        ) : null}
        <div className="margo-post-card__moment-stage-inner">
          <PostCardLyricSection post={post} />
        </div>
      </div>
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
  replayed = false, replayCount = 0, onReplay, onQuoteReplay, onUndoReplay, replayNote = null,
  echoReplayed, echoReplayCount, echoReplayNote,
  disableCardNav = false,
  threadDetail = false,
  threadLyricBackOpen = false,
  onThreadLyricBack,
  domId,
  highlightShared = false,
  recordImpression = true,
  openLyricBack = false,
  onLyricBackPanelChange,
}: PostCardProps) {
  const router = useRouter()
  const { requireAuth } = useAuthGate()
  const { user } = useIdentity()
  const storyRing = useStoryRingContext()
  const authorProfile = useAuthorProfile(post.authorUid || null)
  const viewedRef = useRef(false)
  const emotion = normalizeEmotion(post.emotion || '').toLowerCase()
  const label = VIBE_LABELS[emotion] || post.emotion || ''
  const isTier1 = !!(post.songId && post.audioUrl)
  const audioUrl = post.audioUrl || null
  const cardRef = useRef<HTMLDivElement>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [postLive, setPostLive] = useState(post)
  const lyricBackAllowed = isLyricBackAllowed(post)

  useEffect(() => {
    setPostLive(post)
  }, [post])

  const displayPost = editOpen ? postLive : post
  const isOwner = !!user?.id && !!displayPost.authorUid && displayPost.authorUid === user.id
  const canOwnerEdit = isOwner && !displayPost.contentRemovedAt && !displayPost.parentPostId
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletedLocally, setDeletedLocally] = useState(false)
  const [repostSheetOpen, setRepostSheetOpen] = useState(false)
  const [rowExpanded, setRowExpanded] = useState(false)
  const [avatarBroken, setAvatarBroken] = useState(false)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [echoCountLive, setEchoCountLive] = useState(echoCount)
  const openLyricBackHandledRef = useRef(false)

  useEffect(() => {
    setEchoCountLive(echoCount)
  }, [echoCount, post.id])

  const setLyricBackPanelOpen = useCallback((next: boolean) => {
    setSuggestionsOpen(next)
    onLyricBackPanelChange?.(next)
  }, [onLyricBackPanelChange])

  const toggleLyricBackPanel = useCallback(() => {
    setSuggestionsOpen((prev) => {
      const next = !prev
      onLyricBackPanelChange?.(next)
      return next
    })
  }, [onLyricBackPanelChange])

  useEffect(() => {
    if (!openLyricBack || openLyricBackHandledRef.current || !lyricBackAllowed) return
    openLyricBackHandledRef.current = true
    setLyricBackPanelOpen(true)
  }, [openLyricBack, lyricBackAllowed, setLyricBackPanelOpen])
  useEffect(() => { setAvatarBroken(false) }, [post.authorAvatarUrl, post.authorUid])
  // row collapses to a dense one-liner; expand renders the compact card in place
  const isRow = variant === 'row'
  const isCompact = variant === 'compact' || (isRow && rowExpanded)
  const avatarPx = isCompact ? '32px' : '36px'

  const lines = resolveMomentLines(post)
  const atmosphereRooms = useMemo(
    () => lines.flatMap((l) => (l.songId ? [{ songId: l.songId, lineText: l.text }] : [])),
    [lines],
  )
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
    if (!recordImpression || viewedRef.current) return
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
  }, [post.id, recordImpression])

  const rawAvatarUrl = (post.authorAvatarUrl || authorProfile?.avatarUrl || '').trim()
  const avatarUrl = rawAvatarUrl && !avatarBroken ? rawAvatarUrl : null

  // Optimistic — the server delete already succeeded by the time this is
  // set. Other open surfaces reconcile via their own Realtime subscription
  // (usePosts/useEchoes already listen for postgres_changes on posts).
  if (deletedLocally) {
    return null
  }

  if (editOpen && canOwnerEdit) {
    return (
      <div
        id={domId}
        ref={cardRef}
        className="margo-post-card margo-post-card--editing"
        data-no-card-nav
        style={vibeThemeStyleVars(getVibeTheme(displayPost.emotion || 'chill'))}
      >
        <PostMomentInlineEdit
          post={postLive}
          onRequireAuth={requireAuth}
          onCancel={() => setEditOpen(false)}
          onSaved={(next) => {
            setPostLive(next)
            setEditOpen(false)
          }}
        />
        {lyricBackAllowed && !threadDetail ? (
          <PostCardSuggestedReply
            postId={post.id}
            echoCount={echoCountLive}
            onEchoCountDelta={(delta) => {
              setEchoCountLive((n) => Math.max(0, n + delta))
            }}
            parentUsername={post.username}
            parentEmotion={post.emotion || 'chill'}
            open={suggestionsOpen}
            onClose={() => setLyricBackPanelOpen(false)}
            onRequireAuth={requireAuth}
            onOpenThread={(echoId) => {
              persistActivePrimaryScroll()
              router.push(`/post/${echoId}`)
            }}
            onExportEcho={(echo) => onExport(echoToPost(echo))}
            onReplayEcho={onReplay}
            onQuoteReplayEcho={onQuoteReplay}
            onUndoReplayEcho={onUndoReplay}
            echoReplayed={echoReplayed}
            echoReplayCount={echoReplayCount}
            echoReplayNote={echoReplayNote}
          />
        ) : null}
      </div>
    )
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
    navigateToPostThread(router, post.id)
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
        suggestionsOpen ? 'margo-post-card--lb-panel-open' : '',
      ].filter(Boolean).join(' ')}
      data-lb-panel-open={suggestionsOpen ? '1' : undefined}
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
              indicator="subtle"
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
                    indicator="subtle"
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
          <PostReportMenu
            postId={post.id}
            isOwner={isOwner}
            showOwnerEdit={canOwnerEdit}
            onOwnerEdit={() => setEditOpen(true)}
            showOwnerDelete
            onOwnerDelete={() => setDeleteOpen(true)}
            reportPresentation="inline"
          />
        </div>
      </div>

      <div
        className="margo-post-report-inline-host"
        data-report-inline-host={post.id}
        data-no-card-nav
      />
      <PostMomentBody post={post} atmosphereRooms={atmosphereRooms} />

      {lyricBackAllowed && !threadDetail ? (
        <PostCardSuggestedReply
          postId={post.id}
          echoCount={echoCountLive}
          onEchoCountDelta={(delta) => {
            setEchoCountLive((n) => Math.max(0, n + delta))
          }}
          parentUsername={post.username}
          parentEmotion={post.emotion || 'chill'}
          open={suggestionsOpen}
          onClose={() => setLyricBackPanelOpen(false)}
          onRequireAuth={requireAuth}
          onOpenThread={(echoId) => {
            persistActivePrimaryScroll()
            navigateToPostThread(router, echoId)
          }}
          onExportEcho={(echo) => onExport(echoToPost(echo))}
          onReplayEcho={onReplay}
          onQuoteReplayEcho={onQuoteReplay}
          onUndoReplayEcho={onUndoReplay}
          echoReplayed={echoReplayed}
          echoReplayCount={echoReplayCount}
          echoReplayNote={echoReplayNote}
        />
      ) : null}

      <FeedPostActions
        postId={post.id}
        resonated={resonated}
        resonateCount={resonateCount}
        onResonate={onResonate}
        lyricBackAllowed={lyricBackAllowed}
        lyricBackOpen={threadDetail ? threadLyricBackOpen : suggestionsOpen}
        echoCount={echoCountLive}
        onLyricBack={
          lyricBackAllowed
            ? () => {
                if (threadDetail) {
                  onThreadLyricBack?.()
                  return
                }
                toggleLyricBackPanel()
              }
            : undefined
        }
        onCard={() => onExport(post)}
        replayed={replayed}
        replayCount={replayCount}
        onReplayTap={onReplay ? () => {
          if (!requireAuth()) return
          setRepostSheetOpen(true)
        } : undefined}
      />
      {onReplay ? (
        <RepostSheet
          open={repostSheetOpen}
          onOpenChange={setRepostSheetOpen}
          post={post}
          replayed={replayed}
          existingNote={replayNote}
          onRepost={onReplay}
          onRepostWithNote={(id, note) => onQuoteReplay?.(id, note)}
          onUndo={(id) => onUndoReplay?.(id)}
        />
      ) : null}

      {isOwner ? (
        <DeleteMomentDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          postId={post.id}
          onDeleted={() => setDeletedLocally(true)}
        />
      ) : null}

    </div>
  )
}
