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

export type LyricBackThreadRowExtras = {
  onResonate?: (echoId: string) => void
  onLyricBack?: (echoId: string) => void
  onOpenThread?: (echoId: string) => void
  onExport?: (echo: Echo) => void
  onReplay?: (echoId: string) => void
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
  backToHandle,
  replyToUsername,
  parentEmotion,
  echoCountHint,
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
  getRowExtras,
  showSuggestions = false,
  onApplySuggestion,
  echoesActive,
}: LyricBackFocusBodyProps) {
  const isNested = Boolean(focusId && rootPostId && focusId !== rootPostId && focusedEcho)
  const composeEmotion = isNested && focusedEcho
    ? (focusedEcho.emotion || parentEmotion)
    : parentEmotion
  const showIdeas = showSuggestions && !isNested
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
    if (!showIdeas || !ideasOpen || ideasFetched || ideasLoading) return
    void loadIdeas()
  }, [ideasOpen, ideasFetched, ideasLoading, loadIdeas, showIdeas])

  const applySuggestion = useCallback((s: SuggestedLyricBack) => {
    onApplySuggestion?.(s)
  }, [onApplySuggestion])

  const feedPanel = variant === 'feed-panel'
  const feedRootComposeFirst = feedPanel && !isNested

  const replyContext = composeOpen ? <LyricBackReplyContext username={replyToUsername} /> : null

  const composeSlot =
    composeOpen && focusId ? (
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
          focusSearchOnMount={!feedPanel}
          onSent={() => {
            onSent()
            void refetchEchoes()
          }}
        />
      </div>
    ) : null

  return (
    <>
      {feedPanel && isNested ? (
        <div className="margo-post-card__lb-header margo-post-card__lb-header--nested">
          {backToHandle && onBack ? (
            <button type="button" className="margo-post-card__lb-focus-back" onClick={onBack}>
              ← Back to @{backToHandle}
            </button>
          ) : null}
          <h3 className="margo-post-card__lb-title">Lyric Backs · {headerCount}</h3>
        </div>
      ) : null}

      {!feedPanel && isNested && backToHandle && onBack ? (
        <button type="button" className="margo-post-card__lb-focus-back" onClick={onBack}>
          ← Back to @{backToHandle}
        </button>
      ) : null}

      {replyContext}
      {composeSlot}

      {!feedPanel && isNested && focusedEcho ? (
        <div className="margo-post-card__lb-focused-anchor">
          <LyricBackThreadRow
            echo={focusedEcho}
            tone="anchor"
            onLyricBack={() => onFocusEcho(focusedEcho)}
            onOpenThread={onOpenThread}
            onExport={onExportEcho}
            onReplay={onReplayEcho}
            {...(getRowExtras?.(focusedEcho) ?? {})}
            lyricBackSessionActive={composeOpen}
          />
        </div>
      ) : null}

      {!feedPanel && !isNested && (echoes.length > 0 || echoCountHint > 0) ? (
        <>
          <div className="margo-post-detail-lb__divider" aria-hidden />
          <h2 className="margo-post-detail-lb__heading">Lyric Backs · {headerCount}</h2>
        </>
      ) : null}

      {feedRootComposeFirst ? (
        <div className="margo-post-card__lb-feed-head-row">
          <h3 className="margo-post-card__lb-title margo-post-card__lb-title--below-compose">
            Lyric Backs · {headerCount}
          </h3>
          {onClose ? (
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

      {isNested ? (
        <>
          <div className="margo-post-detail-lb__divider" aria-hidden />
          <h2 className="margo-post-detail-lb__heading">Lyric Backs · {headerCount}</h2>
        </>
      ) : null}

      <div
        className={
          feedPanel
            ? 'margo-post-card__lb-scroll margo-post-card__lb-scroll--feed'
            : 'margo-post-detail-lb__scroll'
        }
      >
        {feedPanel && isNested && focusedEcho ? (
          <div className="margo-post-card__lb-focused-anchor">
            <LyricBackThreadRow
              echo={focusedEcho}
              tone="anchor"
              onLyricBack={() => onFocusEcho(focusedEcho)}
              onOpenThread={onOpenThread}
              onExport={onExportEcho}
              onReplay={onReplayEcho}
              {...(getRowExtras?.(focusedEcho) ?? {})}
              lyricBackSessionActive={composeOpen}
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
                  onLyricBack={() => onFocusEcho(echo)}
                  onOpenThread={onOpenThread}
                  onExport={onExportEcho}
                  onReplay={onReplayEcho}
                  {...(getRowExtras?.(echo) ?? {})}
                />
              </li>
            ))}
          </ul>
        ) : null}

        {!feedPanel && !echoesLoading && echoes.length === 0 && composeOpen ? (
          <p className="margo-post-detail-lb__empty-hint">
            Be the first Lyric Back on this moment.
          </p>
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
      </div>
    </>
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
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const composeRef = useRef<LyricBackPanelComposeHandle>(null)
  const [composePrefill, setComposePrefill] = useState<LyricBackPanelPrefill | null>(null)
  const author = parentUsername || ''
  const {
    focusId,
    focusedEcho,
    isNested,
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
  }, [open, focusId])

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
