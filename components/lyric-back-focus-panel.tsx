'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import {
  captureFeedScrollSnapshot,
  lyricBackNestedAnchorScrollTop,
  restoreFeedScrollSnapshot,
  scrollFeedLyricBackPanelIntoView,
  type FeedScrollSnapshot,
} from '@/lib/lyric-back-panel-scroll'
import { usePathname } from 'next/navigation'
import { LyricBackTrackListenControl } from '@/components/lyric-back-track-listen-control'
import { LyricBackTrackStripPlaceholder } from '@/components/lyric-back-thread-row-skeleton'
import { useEchoes, type Echo } from '@/hooks/useEchoes'
import { LyricBackThreadRow } from '@/components/lyric-back-thread-row'
import {
  FeedIconClose,
  FeedIconChevronRight,
} from '@/components/feed-card-icons'
import type { SuggestedLyricBack } from '@/lib/suggest-lyric-back'
import { fetchLyricBackSuggestionsForPost } from '@/lib/lyric-back-suggestions'
import {
  LyricBackPanelCompose,
  type LyricBackPanelComposeHandle,
  type LyricBackPanelPrefill,
} from '@/components/lyric-back-panel-compose'
import { useLyricBackFocusStack } from '@/hooks/useLyricBackFocusStack'
import type { LyricBackEditPatch } from '@/lib/lyric-back-owner-edit-local'
import type { LyricBackEditSavedPatch } from '@/lib/lyric-back-edit-saved'
import {
  clearLyricBackKeyboardChrome,
  useLyricBackPanelViewport,
} from '@/hooks/useLyricBackPanelViewport'
import { useIdentity } from '@/hooks/useIdentity'
import { SignInLink } from '@/components/signin-link'

export type LyricBackThreadRowExtras = {
  onResonate?: (echoId: string) => void
  onLyricBack?: (echoId: string) => void
  onOpenThread?: (echoId: string) => void
  onExport?: (echo: Echo) => void
  onReplay?: (echoId: string) => void
  onQuoteReplay?: (echoId: string, note: string) => void
  onUndoReplay?: (echoId: string) => void
  replayNote?: string | null
  replayed?: boolean
  replayCount?: number
  resonated?: boolean
  resonateCount?: number
}

export type LyricBackFocusBodyProps = {
  variant: 'feed-panel' | 'post-inline'
  rootPostId: string
  focusId: string
  focusedEcho: Echo | null
  replyToUsername: string
  parentEmotion: string
  echoCountHint: number
  /** Focused row is still allowed to take a Lyric Back. */
  canReply?: boolean
  /** Panel drill depth, capped at 3 visual steps. */
  visualStep?: 0 | 1 | 2 | 3
  composeOpen: boolean
  composeRef: RefObject<LyricBackPanelComposeHandle | null>
  onRequireAuth?: () => boolean
  composePrefill: LyricBackPanelPrefill | null
  onSent: () => void
  onBack?: () => void
  onClose?: () => void
  onFocusEcho: (echo: Echo) => void
  onOpenThread?: (echoId: string) => void
  onExportEcho?: (echo: Echo) => void
  onReplayEcho?: (echoId: string) => void
  onQuoteReplayEcho?: (echoId: string, note: string) => void
  onUndoReplayEcho?: (echoId: string) => void
  echoReplayed?: (echoId: string) => boolean
  echoReplayCount?: (echoId: string) => number
  echoReplayNote?: (echoId: string) => string | null
  getRowExtras?: (echo: Echo) => LyricBackThreadRowExtras
  showSuggestions?: boolean
  onApplySuggestion?: (s: SuggestedLyricBack) => void
  echoesActive: boolean
  /** Fired when a direct child is fully removed (updates header + feed badge). */
  onEchoCountDelta?: (delta: number) => void
  onStackOwnerDelete?: (echoId: string, outcome: 'deleted' | 'shelled') => void
  onStackOwnerEdit?: (echoId: string, patch: LyricBackEditPatch) => void
}

function LyricBackPanelSkeleton() {
  return (
    <div className="margo-post-card__lb-skeleton" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="margo-post-card__lb-skeleton-row">
          <div className="margo-post-card__lb-skeleton-line margo-post-card__lb-skeleton-line--wide" />
          <div className="margo-post-card__lb-skeleton-line margo-post-card__lb-skeleton-line--narrow" />
        </div>
      ))}
    </div>
  )
}

function IdeasSkeleton() {
  return (
    <div className="margo-post-card__lb-skeleton margo-post-card__lb-skeleton--compact" aria-hidden>
      <div className="margo-post-card__lb-skeleton-row">
        <div className="margo-post-card__lb-skeleton-line margo-post-card__lb-skeleton-line--wide" />
        <div className="margo-post-card__lb-skeleton-line margo-post-card__lb-skeleton-line--narrow" />
      </div>
    </div>
  )
}

export function LyricBackFocusBody({
  variant,
  rootPostId,
  focusId,
  focusedEcho,
  replyToUsername,
  parentEmotion,
  echoCountHint,
  canReply = true,
  visualStep = 0,
  composeOpen,
  composeRef,
  onRequireAuth,
  composePrefill,
  onSent,
  onBack,
  onClose,
  onFocusEcho,
  onOpenThread,
  onExportEcho,
  onReplayEcho,
  onQuoteReplayEcho,
  onUndoReplayEcho,
  echoReplayed,
  echoReplayCount,
  echoReplayNote,
  getRowExtras,
  showSuggestions = false,
  onApplySuggestion,
  echoesActive,
  onEchoCountDelta,
  onStackOwnerDelete,
  onStackOwnerEdit,
}: LyricBackFocusBodyProps) {
  const { user } = useIdentity()
  const signedIn = !!user && !user.isAnonymous
  const isNested = Boolean(focusId && rootPostId && focusId !== rootPostId && focusedEcho)
  const composeEmotion = isNested && focusedEcho
    ? (focusedEcho.emotion || parentEmotion)
    : parentEmotion
  const showIdeas = showSuggestions && !isNested && signedIn
  const showIdeasSignUp = showSuggestions && !isNested && !signedIn
  const {
    echoes,
    loading: echoesLoading,
    refetch: refetchEchoes,
    applyOwnerDeleteOutcome,
    applyOwnerEditOutcome,
  } = useEchoes(echoesActive ? focusId : null)
  const focusSeenRef = useRef(focusId)
  const loadedFocusRef = useRef<string | null>(null)
  if (focusSeenRef.current !== focusId) {
    focusSeenRef.current = focusId
    loadedFocusRef.current = null
  }
  if (echoesLoading) loadedFocusRef.current = focusId
  const echoesReady = Boolean(focusId) && !echoesLoading && loadedFocusRef.current === focusId

  const handleOwnerDeleted = useCallback(
    (echoId: string, outcome: 'deleted' | 'shelled') => {
      applyOwnerDeleteOutcome(echoId, outcome)
      onStackOwnerDelete?.(echoId, outcome)
      if (outcome === 'deleted') {
        onEchoCountDelta?.(-1)
      }
      if (outcome === 'deleted' && focusedEcho?.id === echoId) {
        onBack?.()
      }
      refetchEchoes()
    },
    [
      applyOwnerDeleteOutcome,
      focusedEcho?.id,
      onBack,
      onEchoCountDelta,
      onStackOwnerDelete,
      refetchEchoes,
    ],
  )

  const handleOwnerEdited = useCallback(
    (echoId: string, saved: LyricBackEditSavedPatch) => {
      const patch: LyricBackEditPatch = {
        lyric: saved.lyric,
        song: saved.song,
        artist: saved.artist,
        emotion: saved.emotion,
        songId: saved.songId,
        snippetStart: saved.snippetStart,
        snippetEnd: saved.snippetEnd,
        artwork: saved.artwork,
        externalListenUrl: saved.externalListenUrl,
        audioUrl: saved.audioUrl,
      }
      applyOwnerEditOutcome(echoId, patch)
      onStackOwnerEdit?.(echoId, patch)
    },
    [applyOwnerEditOutcome, onStackOwnerEdit],
  )

  const [ideasOpen, setIdeasOpen] = useState(false)
  const [ideasLoading, setIdeasLoading] = useState(false)
  const [ideasError, setIdeasError] = useState<string | null>(null)
  const [picks, setPicks] = useState<SuggestedLyricBack[] | null>(null)
  const [ideasFetched, setIdeasFetched] = useState(false)

  const headerCount = useMemo(
    () => Math.max(
      isNested && focusedEcho ? (focusedEcho.echoCount ?? 0) : echoCountHint,
      echoesReady ? echoes.length : 0,
    ),
    [echoCountHint, echoes.length, echoesReady, focusedEcho, isNested],
  )

  const repostFor = (echo: Echo) => {
    const extras = getRowExtras?.(echo)
    return {
      onReplay: extras?.onReplay ?? onReplayEcho,
      onQuoteReplay: extras?.onQuoteReplay ?? onQuoteReplayEcho,
      onUndoReplay: extras?.onUndoReplay ?? onUndoReplayEcho,
      replayed: extras?.replayed != null ? extras.replayed : (echoReplayed?.(echo.id) ?? false),
      replayCount: extras?.replayCount != null ? extras.replayCount : (echoReplayCount?.(echo.id) ?? 0),
      replayNote: extras?.replayNote != null ? extras.replayNote : (echoReplayNote?.(echo.id) ?? null),
    }
  }

  const loadIdeas = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIdeasError('Offline')
      setIdeasFetched(true)
      setIdeasLoading(false)
      return
    }
    setIdeasLoading(true)
    setIdeasError(null)
    try {
      const list = await fetchLyricBackSuggestionsForPost(rootPostId)
      setPicks(list)
      setIdeasFetched(true)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not load ideas'
      setIdeasError(message)
      setPicks(null)
      setIdeasFetched(false)
    } finally {
      setIdeasLoading(false)
    }
  }, [rootPostId])

  useEffect(() => {
    if (!signedIn || !showIdeas || !ideasOpen || ideasFetched || ideasLoading) return
    void loadIdeas()
  }, [signedIn, ideasOpen, ideasFetched, ideasLoading, loadIdeas, showIdeas])

  const applySuggestion = useCallback((s: SuggestedLyricBack) => {
    onApplySuggestion?.(s)
  }, [onApplySuggestion])

  const feedPanel = variant === 'feed-panel'
  const emptyFirstRoot = !isNested
    && !ideasOpen
    && echoCountHint === 0
    && echoesReady
    && echoes.length === 0
  const showCompose = composeOpen && canReply && Boolean(focusId)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollMemory = useRef<Map<string, number>>(new Map())
  const pendingRestore = useRef<string | null>(null)
  const restoringScroll = useRef(false)
  const sentSnapshot = useRef<Set<string> | null>(null)
  const echoesReadyRef = useRef(echoesReady)
  echoesReadyRef.current = echoesReady

  const rememberScroll = useCallback((id: string) => {
    const el = scrollRef.current
    if (!el || !id || restoringScroll.current || !echoesReadyRef.current) return
    scrollMemory.current.set(id, el.scrollTop)
  }, [])

  const onListScroll = useCallback(() => {
    rememberScroll(focusId)
  }, [focusId, rememberScroll])

  useLayoutEffect(() => {
    pendingRestore.current = focusId
    sentSnapshot.current = null
  }, [focusId])

  // A new level is for looking. The keyboard opens only after a tap on search.
  useLayoutEffect(() => {
    const root = scrollRef.current?.closest('.margo-lb-focus')
    const field = root?.querySelector('input, textarea')
    if (field instanceof HTMLElement && document.activeElement === field) field.blur()
  }, [focusId])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || !echoesReady) return

    const snapshot = sentSnapshot.current
    if (snapshot && pendingRestore.current !== focusId) {
      const fresh = echoes.find((echo) => !snapshot.has(echo.id))
      if (fresh) {
        sentSnapshot.current = null
        const row = el.querySelector(`[data-echo-id="${CSS.escape(fresh.id)}"]`)
        if (row instanceof HTMLElement) {
          restoringScroll.current = true
          const delta = row.getBoundingClientRect().top - el.getBoundingClientRect().top
          el.scrollTop += delta - 8
          scrollMemory.current.set(focusId, el.scrollTop)
          requestAnimationFrame(() => {
            restoringScroll.current = false
          })
        }
        return
      }
      sentSnapshot.current = null
    }

    if (pendingRestore.current !== focusId) return
    restoringScroll.current = true
    const saved = scrollMemory.current.get(focusId)
    if (saved != null) {
      el.scrollTop = saved
    } else if (isNested) {
      const anchor = el.querySelector('[data-lb-anchor="1"]')
      if (anchor instanceof HTMLElement) {
        el.scrollTop = lyricBackNestedAnchorScrollTop({
          scrollTop: el.scrollTop,
          anchorBottom: anchor.getBoundingClientRect().bottom,
          scrollerTop: el.getBoundingClientRect().top,
        })
      } else {
        el.scrollTop = 0
      }
    } else {
      el.scrollTop = 0
    }
    scrollMemory.current.set(focusId, el.scrollTop)
    pendingRestore.current = null
    requestAnimationFrame(() => {
      restoringScroll.current = false
    })
  }, [echoes, echoesReady, focusId, isNested])

  const focusRow = useCallback((echo: Echo) => {
    rememberScroll(focusId)
    onFocusEcho(echo)
  }, [focusId, onFocusEcho, rememberScroll])

  const goBack = useCallback(() => {
    rememberScroll(focusId)
    onBack?.()
  }, [focusId, onBack, rememberScroll])

  const TitleTag = feedPanel ? 'h3' : 'h2'

  const renderBar = (search: ReactNode) => (
    <div className="margo-lb-focus__pin" data-lb-pin="1">
      <div className="margo-lb-focus__tabs">
        {isNested && onBack ? (
          <button
            type="button"
            className="margo-lb-focus__back-chip"
            onPointerDown={(event) => {
              if (event.button !== 0) return
              event.preventDefault()
              event.stopPropagation()
              goBack()
            }}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              goBack()
            }}
          >
            <span className="margo-lb-focus__back-mark" aria-hidden>
              <FeedIconChevronRight size={12} />
            </span>
            Back
          </button>
        ) : null}
        <div className="margo-lb-focus__switch" role="tablist" aria-label="Lyric Backs">
          <button
            type="button"
            role="tab"
            aria-selected={!ideasOpen}
            className={`margo-lb-focus__tab${!ideasOpen ? ' margo-lb-focus__tab--on' : ''}`}
            onClick={() => setIdeasOpen(false)}
          >
            Lyric Backs
          </button>
          {showIdeas ? (
            <button
              type="button"
              role="tab"
              aria-selected={ideasOpen}
              className={`margo-lb-focus__tab${ideasOpen ? ' margo-lb-focus__tab--on' : ''}`}
              onClick={() => setIdeasOpen(true)}
            >
              Ideas
            </button>
          ) : null}
          {showIdeasSignUp ? (
            onRequireAuth ? (
              <button
                type="button"
                className="margo-lb-focus__tab margo-lb-focus__tab--on"
                onClick={() => onRequireAuth()}
              >
                Sign in
              </button>
            ) : (
              <SignInLink className="margo-lb-focus__tab margo-lb-focus__tab--on">
                Sign in
              </SignInLink>
            )
          ) : null}
        </div>
        {feedPanel && onClose ? (
          <button
            type="button"
            className="margo-post-card__lb-close margo-lb-focus__close"
            aria-label="Close Lyric Backs"
            onClick={onClose}
          >
            <FeedIconClose size={16} />
          </button>
        ) : null}
      </div>
      {search ? <div className="margo-lb-focus__search-wrap">{search}</div> : null}
    </div>
  )

  return (
    <div
      className={
        'margo-lb-focus'
        + (emptyFirstRoot ? ' margo-lb-focus--first-reply' : '')
      }
      data-lb-first-reply={emptyFirstRoot ? '1' : undefined}
    >
      <TitleTag className="margo-sr-only">
        Lyric Backs, {headerCount}
        {replyToUsername ? `, ${String(replyToUsername).replace(/^@/, '')}` : ''}
      </TitleTag>
      <div className="margo-lb-focus__chrome">
        {showCompose ? (
          <LyricBackPanelCompose
            ref={composeRef}
            layout="panel"
            parentPostId={focusId}
            parentEmotion={composeEmotion}
            onRequireAuth={onRequireAuth}
            prefill={composePrefill}
            focusSearchOnMount={false}
            replyToLabel={null}
            renderBar={renderBar}
            pinSearchInBar={!emptyFirstRoot}
            onSent={() => {
              sentSnapshot.current = new Set(echoes.map((echo) => echo.id))
              onSent()
              void refetchEchoes()
            }}
          />
        ) : (
          renderBar(null)
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={onListScroll}
        className={
          feedPanel
            ? 'margo-lb-focus__scroll margo-post-card__lb-scroll margo-post-card__lb-scroll--feed'
            : 'margo-lb-focus__scroll margo-post-detail-lb__scroll'
        }
      >
        {ideasOpen && showIdeas ? (
          <div className="margo-lb-focus__ideas">
            {ideasLoading ? <IdeasSkeleton /> : null}
            {ideasError && !ideasLoading ? (
              <button
                type="button"
                className="margo-lb-focus__tab margo-lb-focus__tab--on"
                onClick={() => void loadIdeas()}
              >
                Retry
              </button>
            ) : null}
            {!ideasLoading && !ideasError && (picks?.length ?? 0) > 0 && picks ? (
              <ul className="margo-post-card__lb-list">
                {picks.map((s) => (
                  <li key={`${s.songId}_${s.lineIndex}_${s.startSec}`}>
                    <SuggestionRow suggestion={s} onAccept={() => applySuggestion(s)} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {!ideasOpen && isNested && focusedEcho ? (
          <div className="margo-post-card__lb-focused-anchor" data-lb-anchor="1">
            <LyricBackThreadRow
              echo={focusedEcho}
              tone="anchor"
              onOpenThread={onOpenThread}
              onExport={onExportEcho}
              {...repostFor(focusedEcho)}
              {...(getRowExtras?.(focusedEcho) ?? {})}
              hideLyricBackAction={!canReply}
              onLyricBack={canReply ? () => focusRow(focusedEcho) : undefined}
              lyricBackSessionActive={showCompose}
              onOwnerDeleted={handleOwnerDeleted}
              onOwnerEdited={handleOwnerEdited}
            />
          </div>
        ) : null}

        {!ideasOpen && !echoesReady ? (
          <>
            <LyricBackTrackStripPlaceholder />
            <LyricBackPanelSkeleton />
          </>
        ) : null}

        {!ideasOpen && echoesReady && echoes.length > 0 ? (
          <ul className={feedPanel ? 'margo-post-card__lb-list margo-post-card__lb-list--echoes' : 'margo-post-thread-list'}>
            {echoes.map((echo, index) => (
              <li key={echo.id} data-lb-first-row={index === 0 ? '1' : undefined}>
                <LyricBackThreadRow
                  echo={echo}
                  tone="reply"
                  onOpenThread={onOpenThread}
                  onExport={onExportEcho}
                  {...repostFor(echo)}
                  {...(getRowExtras?.(echo) ?? {})}
                  visualStep={visualStep}
                  hideLyricBackAction={!canReply}
                  onLyricBack={canReply ? () => focusRow(echo) : undefined}
                  onOwnerDeleted={handleOwnerDeleted}
                  onOwnerEdited={handleOwnerEdited}
                />
              </li>
            ))}
          </ul>
        ) : null}

        <div className="margo-lb-focus__end" aria-hidden />
      </div>
    </div>
  )
}

function SuggestionRow({
  suggestion,
  onAccept,
}: {
  suggestion: SuggestedLyricBack
  onAccept: () => void
}) {
  return (
    <div className="margo-post-card__lb-row">
      <button type="button" onClick={onAccept} className="margo-post-card__lb-row-body">
        <p className="margo-post-card__lb-row-lyric">&ldquo;{suggestion.text}&rdquo;</p>
        <p className="margo-post-card__lb-row-meta">
          <span className="margo-post-card__lb-echo-song">{suggestion.songTitle}</span>
          <span className="margo-post-card__lb-echo-artist">{suggestion.artistName}</span>
        </p>
      </button>
      <LyricBackTrackListenControl
        className="margo-post-card__lb-row-play"
        visual="feed-row"
        songId={suggestion.songId}
        audioUrl={suggestion.audioUrl}
        songTitle={suggestion.songTitle}
        artistName={suggestion.artistName}
        lineIndex={suggestion.lineIndex}
        lineText={suggestion.text}
        startSec={suggestion.startSec}
        endSec={suggestion.endSec}
        artwork={suggestion.artworkUrl}
        source="feed"
      />
    </div>
  )
}

/** Feed card inline panel — owns focus stack state. */
export function LyricBackFeedPanel({
  postId,
  echoCount,
  parentUsername,
  parentEmotion,
  open,
  onClose,
  onRequireAuth,
  onOpenThread,
  onExportEcho,
  onReplayEcho,
  onQuoteReplayEcho,
  onUndoReplayEcho,
  echoReplayed,
  echoReplayCount,
  echoReplayNote,
  onEchoCountDelta,
}: {
  postId: string
  echoCount: number
  onEchoCountDelta?: (delta: number) => void
  parentUsername?: string | null
  parentEmotion: string
  open: boolean
  onClose: () => void
  onRequireAuth?: () => boolean
  onOpenThread?: (echoId: string) => void
  onExportEcho?: (echo: Echo) => void
  onReplayEcho?: (echoId: string) => void
  onQuoteReplayEcho?: (echoId: string, note: string) => void
  onUndoReplayEcho?: (echoId: string) => void
  echoReplayed?: (echoId: string) => boolean
  echoReplayCount?: (echoId: string) => number
  echoReplayNote?: (echoId: string) => string | null
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const composeRef = useRef<LyricBackPanelComposeHandle>(null)
  const [composePrefill, setComposePrefill] = useState<LyricBackPanelPrefill | null>(null)
  const author = parentUsername || ''
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const {
    focusId,
    focusedEcho,
    isNested,
    canReply,
    visualStep,
    replyToUsername,
    drillInto,
    requestBack,
    resetStack,
    applyOwnerDeleteOutcome: applyStackOwnerDelete,
    applyOwnerEditOutcome: applyStackOwnerEdit,
  } = useLyricBackFocusStack(postId, author, 0, {
    history: open,
    onExit: () => onCloseRef.current(),
  })

  const pathname = usePathname()
  const onFeed = pathname === '/feed'
  const wasOpenRef = useRef(open)
  useLyricBackPanelViewport(panelRef, open && onFeed)
  const feedScrollSnapshot = useRef<FeedScrollSnapshot | null>(null)

  useEffect(() => {
    if (open) return
    if (feedScrollSnapshot.current) {
      restoreFeedScrollSnapshot(feedScrollSnapshot.current)
      feedScrollSnapshot.current = null
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) clearLyricBackKeyboardChrome()
      resetStack()
      setComposePrefill(null)
    }
    wasOpenRef.current = open
  }, [open, postId, resetStack])

  useEffect(() => {
    if (onFeed || !open) return
    clearLyricBackKeyboardChrome()
    const field = panelRef.current?.querySelector('input, textarea')
    if (field instanceof HTMLElement) field.blur()
  }, [onFeed, open])

  const focusNested = useCallback((echo: Echo) => {
    drillInto(echo)
    setComposePrefill(null)
  }, [drillInto])

  const handleBack = useCallback(() => {
    requestBack()
    setComposePrefill(null)
  }, [requestBack])

  const [echoCountLive, setEchoCountLive] = useState(echoCount)
  useEffect(() => {
    setEchoCountLive(echoCount)
  }, [echoCount, postId])

  const handleEchoCountDelta = useCallback(
    (delta: number) => {
      setEchoCountLive((n) => Math.max(0, n + delta))
      onEchoCountDelta?.(delta)
    },
    [onEchoCountDelta],
  )

  useLayoutEffect(() => {
    if (!open || !onFeed) return
    const panel = panelRef.current
    if (!panel) return
    if (!feedScrollSnapshot.current) {
      feedScrollSnapshot.current = captureFeedScrollSnapshot(panel)
    }
    const firstReply = !isNested && echoCountLive === 0
    if (firstReply) return
    scrollFeedLyricBackPanelIntoView(panel)
    const frame = window.requestAnimationFrame(() => {
      if (!isNested && echoCountLive === 0) return
      scrollFeedLyricBackPanelIntoView(panelRef.current)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, onFeed, focusId, isNested, echoCountLive])

  if (!open || !postId) return null

  return (
    <div
      ref={panelRef}
      data-no-card-nav
      className={`margo-post-card__lb-panel${
        isNested ? ' margo-post-card__lb-panel--thread-focus' : ' margo-post-card__lb-panel--feed-root'
      }${!isNested && echoCountLive === 0 ? ' margo-post-card__lb-panel--first-reply' : ''}`}
      data-lb-first-reply={!isNested && echoCountLive === 0 ? '1' : undefined}
      role="region"
      aria-label="Lyric Backs"
    >
      <LyricBackFocusBody
        variant="feed-panel"
        rootPostId={postId}
        focusId={focusId}
        focusedEcho={focusedEcho}
        replyToUsername={replyToUsername}
        parentEmotion={parentEmotion}
        echoCountHint={echoCountLive}
        onEchoCountDelta={handleEchoCountDelta}
        onStackOwnerDelete={applyStackOwnerDelete}
        onStackOwnerEdit={applyStackOwnerEdit}
        canReply={canReply}
        visualStep={visualStep}
        composeOpen
        composeRef={composeRef}
        onRequireAuth={onRequireAuth}
        composePrefill={composePrefill}
        onSent={() => setComposePrefill(null)}
        onBack={handleBack}
        onClose={onClose}
        onFocusEcho={focusNested}
        onOpenThread={onOpenThread}
        onExportEcho={onExportEcho}
        onReplayEcho={onReplayEcho}
        onQuoteReplayEcho={onQuoteReplayEcho}
        onUndoReplayEcho={onUndoReplayEcho}
        echoReplayed={echoReplayed}
        echoReplayCount={echoReplayCount}
        echoReplayNote={echoReplayNote}
        onApplySuggestion={(s) => {
          setComposePrefill({
            lyric: s.text,
            songTitle: s.songTitle,
            artistName: s.artistName,
            songId: s.songId,
            audioUrl: s.audioUrl ?? null,
            startSec: s.startSec,
            endSec: s.endSec,
          })
          composeRef.current?.focusSearch()
        }}
        showSuggestions
        echoesActive
      />
    </div>
  )
}
