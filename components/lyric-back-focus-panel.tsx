'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { usePathname } from 'next/navigation'
import { LyricBackTrackListenControl } from '@/components/lyric-back-track-listen-control'
import { LyricBackTrackStripPlaceholder } from '@/components/lyric-back-thread-row-skeleton'
import { scrollFeedLyricBackSearchUnderNav } from '@/lib/lyric-back-panel-scroll'
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
import { LyricBackReplyContext } from '@/components/lyric-back-reply-context'
import { useLyricBackFocusStack } from '@/hooks/useLyricBackFocusStack'
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
  /** Parent one level up (@handle without @). Null at root. */
  backToHandle: string | null
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
}: LyricBackFocusBodyProps) {
  const { user } = useIdentity()
  const signedIn = !!user && !user.isAnonymous
  const isNested = Boolean(focusId && rootPostId && focusId !== rootPostId && focusedEcho)
  const composeEmotion = isNested && focusedEcho
    ? (focusedEcho.emotion || parentEmotion)
    : parentEmotion
  const showIdeas = showSuggestions && !isNested && signedIn
  const showIdeasSignUp = showSuggestions && !isNested && !signedIn
  const { echoes, loading: echoesLoading, refetch: refetchEchoes } = useEchoes(
    echoesActive ? focusId : null,
  )

  const [ideasOpen, setIdeasOpen] = useState(false)
  const [ideasLoading, setIdeasLoading] = useState(false)
  const [ideasError, setIdeasError] = useState<string | null>(null)
  const [picks, setPicks] = useState<SuggestedLyricBack[] | null>(null)
  const [ideasFetched, setIdeasFetched] = useState(false)

  const headerCount = useMemo(
    () => Math.max(isNested && focusedEcho ? (focusedEcho.echoCount ?? 0) : echoCountHint, echoes.length),
    [echoCountHint, echoes.length, focusedEcho, isNested],
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
  const showCompose = composeOpen && canReply && Boolean(focusId)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const scrollMemory = useRef<Map<string, number>>(new Map())
  const restoreFocus = useRef<string | null>(null)
  const sawLoading = useRef(false)
  const sentSnapshot = useRef<Set<string> | null>(null)

  const rememberScroll = useCallback((id: string) => {
    const el = scrollRef.current
    if (!el || !id) return
    scrollMemory.current.set(id, el.scrollTop)
  }, [])

  const onListScroll = useCallback(() => {
    rememberScroll(focusId)
  }, [focusId, rememberScroll])

  useLayoutEffect(() => {
    sentSnapshot.current = null
    restoreFocus.current = focusId
    sawLoading.current = false
  }, [focusId])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (echoesLoading) {
      sawLoading.current = true
      return
    }

    const snapshot = sentSnapshot.current
    if (snapshot) {
      const fresh = echoes.find((echo) => !snapshot.has(echo.id))
      if (fresh) {
        sentSnapshot.current = null
        restoreFocus.current = null
        const row = el.querySelector(`[data-echo-id="${CSS.escape(fresh.id)}"]`)
        if (row instanceof HTMLElement) {
          const delta = row.getBoundingClientRect().top - el.getBoundingClientRect().top
          el.scrollTop += delta - 8
          scrollMemory.current.set(focusId, el.scrollTop)
        }
        return
      }
      sentSnapshot.current = null
    }

    if (restoreFocus.current !== focusId || !sawLoading.current) return
    el.scrollTop = scrollMemory.current.get(focusId) ?? 0
    restoreFocus.current = null
  }, [echoes, echoesLoading, focusId])

  const focusRow = useCallback((echo: Echo) => {
    rememberScroll(focusId)
    onFocusEcho(echo)
  }, [focusId, onFocusEcho, rememberScroll])

  useLayoutEffect(() => {
    const dock = dockRef.current
    const root = dock?.closest('.margo-lb-focus')
    if (!(dock instanceof HTMLElement) || !(root instanceof HTMLElement)) return
    const apply = () => {
      root.style.setProperty('--lb-dock-space', `${dock.offsetHeight + 12}px`)
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(dock)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--lb-dock-space')
    }
  }, [showCompose, focusId])

  const goBack = useCallback(() => {
    rememberScroll(focusId)
    onBack?.()
  }, [focusId, onBack, rememberScroll])

  const replyContext = showCompose ? <LyricBackReplyContext username={replyToUsername} /> : null

  const composeSlot =
    showCompose ? (
      <div
        className={`margo-post-card__lb-compose-slot${isNested ? ' margo-post-card__lb-compose-slot--focus' : ' margo-post-card__lb-compose-slot--feed-lead'}`}
      >
        <LyricBackPanelCompose
          ref={composeRef}
          key={focusId}
          layout="panel"
          parentPostId={focusId}
          parentEmotion={composeEmotion}
          onRequireAuth={onRequireAuth}
          prefill={composePrefill}
          focusSearchOnMount={false}
          onSent={() => {
            sentSnapshot.current = new Set(echoes.map((echo) => echo.id))
            onSent()
            void refetchEchoes()
          }}
        />
      </div>
    ) : null

  const showTitle = isNested || headerCount > 0
  const showBar = showTitle || isNested || Boolean(feedPanel && onClose)
  const TitleTag = feedPanel ? 'h3' : 'h2'

  return (
    <div className="margo-lb-focus">
      {showBar ? (
        <div className={`margo-lb-focus__bar${isNested ? ' margo-lb-focus__bar--nested' : ''}`}>
          {isNested && onBack ? (
            <button type="button" className="margo-post-card__lb-focus-back" onClick={goBack}>
              Back
            </button>
          ) : null}
          {showTitle ? (
            <TitleTag className={feedPanel ? 'margo-post-card__lb-title' : 'margo-post-detail-lb__heading'}>
              Lyric Backs · {headerCount}
            </TitleTag>
          ) : null}
          {feedPanel && onClose ? (
            <button
              type="button"
              className="margo-post-card__lb-close"
              aria-label="Close Lyric Backs"
              onClick={onClose}
            >
              <FeedIconClose size={20} />
            </button>
          ) : null}
        </div>
      ) : null}

      {showCompose ? (
        <div className="margo-lb-focus__dock" ref={dockRef}>
          {replyContext}
          {composeSlot}
        </div>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={onListScroll}
        className={
          feedPanel
            ? 'margo-lb-focus__scroll margo-post-card__lb-scroll margo-post-card__lb-scroll--feed'
            : 'margo-lb-focus__scroll margo-post-detail-lb__scroll'
        }
      >
        {isNested && focusedEcho ? (
          <div className="margo-post-card__lb-focused-anchor">
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
            />
          </div>
        ) : null}

        {echoesLoading ? (
          <>
            <LyricBackTrackStripPlaceholder />
            <LyricBackPanelSkeleton />
          </>
        ) : null}

        {!echoesLoading && echoes.length > 0 ? (
          <ul className={feedPanel ? 'margo-post-card__lb-list margo-post-card__lb-list--echoes' : 'margo-post-thread-list'}>
            {echoes.map((echo) => (
              <li key={echo.id}>
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
                />
              </li>
            ))}
          </ul>
        ) : null}

        {showIdeasSignUp ? (
          <div className="margo-post-card__lb-ideas-section">
            <p className="margo-post-card__lb-status" style={{ marginBottom: '10px' }}>
              Sign in for catalog suggestions while you Lyric Back.
            </p>
            {onRequireAuth ? (
              <button
                type="button"
                className="margo-post-card__lb-footer-btn margo-post-card__lb-footer-btn--full"
                onClick={() => onRequireAuth()}
              >
                Sign in
              </button>
            ) : (
              <SignInLink
                className="margo-post-card__lb-footer-btn margo-post-card__lb-footer-btn--full"
                style={{ display: 'inline-flex', justifyContent: 'center', textDecoration: 'none' }}
              >
                Sign in
              </SignInLink>
            )}
          </div>
        ) : null}

        {showIdeas ? (
          <div className="margo-post-card__lb-ideas-section">
            <button
              type="button"
              className="margo-post-card__lb-ideas-toggle"
              aria-expanded={ideasOpen}
              onClick={() => setIdeasOpen((o) => !o)}
            >
              <span>Suggestions</span>
              <span
                className="margo-post-card__lb-ideas-chevron"
                style={{ transform: ideasOpen ? 'rotate(90deg)' : 'none' }}
              >
                <FeedIconChevronRight size={16} />
              </span>
            </button>

            {ideasOpen ? (
              <div className="margo-post-card__lb-ideas-body">
                {ideasLoading ? <IdeasSkeleton /> : null}
                {ideasError && !ideasLoading ? (
                  <div className="margo-post-card__lb-status-block">
                    <p className="margo-post-card__lb-status">{ideasError}</p>
                    <button
                      type="button"
                      className="margo-post-card__lb-footer-btn margo-post-card__lb-footer-btn--full"
                      onClick={() => void loadIdeas()}
                    >
                      Retry
                    </button>
                  </div>
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
          </div>
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
}: {
  postId: string
  echoCount: number
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
  const {
    focusId,
    focusedEcho,
    isNested,
    canReply,
    visualStep,
    backToHandle,
    replyToUsername,
    drillInto,
    backOneLevel,
    resetStack,
  } = useLyricBackFocusStack(postId, author)

  const pathname = usePathname()
  const onFeed = pathname === '/feed'
  const wasOpenRef = useRef(open)
  useLyricBackPanelViewport(panelRef, open && onFeed)

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

  useLayoutEffect(() => {
    if (!open) return
    scrollFeedLyricBackSearchUnderNav(panelRef.current)
    composeRef.current?.focusSearch(true)
  }, [open, composeRef])

  useLayoutEffect(() => {
    if (!open) return
    composeRef.current?.focusSearch(true)
  }, [open, focusId, composeRef])

  const focusNested = useCallback((echo: Echo) => {
    drillInto(echo)
    setComposePrefill(null)
  }, [drillInto])

  const handleBack = useCallback(() => {
    backOneLevel()
    setComposePrefill(null)
  }, [backOneLevel])

  if (!open || !postId) return null

  return (
    <div
      ref={panelRef}
      data-no-card-nav
      className={`margo-post-card__lb-panel${isNested ? ' margo-post-card__lb-panel--thread-focus' : ' margo-post-card__lb-panel--feed-root'}`}
      role="region"
      aria-label="Lyric Backs"
    >
      <LyricBackFocusBody
        variant="feed-panel"
        rootPostId={postId}
        focusId={focusId}
        focusedEcho={focusedEcho}
        backToHandle={backToHandle}
        replyToUsername={replyToUsername}
        parentEmotion={parentEmotion}
        echoCountHint={echoCount}
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
          composeRef.current?.focusSearch(true)
        }}
        showSuggestions
        echoesActive
      />
    </div>
  )
}
