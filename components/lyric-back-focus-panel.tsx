'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { playSnippet, togglePlayPause } from '@/lib/audio-engine'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { useEchoes, type Echo } from '@/hooks/useEchoes'
import { LyricBackThreadRow } from '@/components/lyric-back-thread-row'
import {
  FeedIconClose,
  FeedIconChevronRight,
  FeedMomentPlaybackIcon,
} from '@/components/feed-card-icons'
import type { SuggestedLyricBack } from '@/lib/suggest-lyric-back'
import { fetchLyricBackSuggestionsForPost } from '@/lib/lyric-back-suggestions'
import {
  LyricBackPanelCompose,
  type LyricBackPanelComposeHandle,
  type LyricBackPanelPrefill,
} from '@/components/lyric-back-panel-compose'
import { LyricBackReplyContext } from '@/components/lyric-back-reply-context'

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
  const isNested = focusId !== rootPostId && focusedEcho != null
  const composeEmotion = isNested ? (focusedEcho.emotion || parentEmotion) : parentEmotion
  const { echoes, loading: echoesLoading, refetch: refetchEchoes } = useEchoes(
    echoesActive ? focusId : null,
  )

  const [ideasOpen, setIdeasOpen] = useState(false)
  const [ideasLoading, setIdeasLoading] = useState(false)
  const [ideasError, setIdeasError] = useState<string | null>(null)
  const [picks, setPicks] = useState<SuggestedLyricBack[] | null>(null)
  const [ideasFetched, setIdeasFetched] = useState(false)

  const headerCount = useMemo(
    () => Math.max(isNested ? (focusedEcho.echoCount ?? 0) : echoCountHint, echoes.length),
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
    if (!showSuggestions || !ideasOpen || ideasFetched || ideasLoading) return
    void loadIdeas()
  }, [ideasOpen, ideasFetched, ideasLoading, loadIdeas, showSuggestions])

  const applySuggestion = useCallback((s: SuggestedLyricBack) => {
    onApplySuggestion?.(s)
  }, [onApplySuggestion])

  const feedPanel = variant === 'feed-panel'

  return (
    <>
      {feedPanel ? (
        <div className={`margo-post-card__lb-header${isNested ? ' margo-post-card__lb-header--nested' : ''}`}>
          {isNested && backToHandle && onBack ? (
            <button type="button" className="margo-post-card__lb-focus-back" onClick={onBack}>
              ← Back to @{backToHandle}
            </button>
          ) : null}
          <h3 className="margo-post-card__lb-title">Lyric Backs · {headerCount}</h3>
          {!isNested && onClose ? (
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

      {!feedPanel && isNested && backToHandle && onBack ? (
        <button type="button" className="margo-post-card__lb-focus-back" onClick={onBack}>
          ← Back to @{backToHandle}
        </button>
      ) : null}

      {composeOpen ? <LyricBackReplyContext username={replyToUsername} /> : null}

      {isNested && focusedEcho ? (
        <div className="margo-post-card__lb-focused-anchor">
          <LyricBackThreadRow
            echo={focusedEcho}
            tone="anchor"
            hideLyricBackAction
            onOpenThread={onOpenThread}
            onExport={onExportEcho}
            onReplay={onReplayEcho}
            {...(getRowExtras?.(focusedEcho) ?? {})}
          />
        </div>
      ) : null}

      {composeOpen ? (
        <div className="margo-post-card__lb-compose-slot">
          <LyricBackPanelCompose
            ref={composeRef}
            key={focusId}
            layout="panel"
            parentPostId={focusId}
            parentEmotion={composeEmotion}
            onRequireAuth={onRequireAuth}
            prefill={composePrefill}
            focusSearchOnMount
            onSent={() => {
              onSent()
              void refetchEchoes()
            }}
          />
        </div>
      ) : null}

      {!feedPanel && !isNested && echoes.length > 0 ? (
        <>
          <div className="margo-post-detail-lb__divider" aria-hidden />
          <h2 className="margo-post-detail-lb__heading">Lyric Backs · {headerCount}</h2>
        </>
      ) : null}

      {isNested ? (
        <>
          <div className="margo-post-detail-lb__divider" aria-hidden />
          <h2 className="margo-post-detail-lb__heading">Lyric Backs · {headerCount}</h2>
        </>
      ) : null}

      <div className={feedPanel ? 'margo-post-card__lb-scroll' : undefined}>
        {echoesLoading ? <LyricBackPanelSkeleton /> : null}

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

        {showSuggestions ? (
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
  const engine = useAudioEngine()
  const canPlay = Boolean(suggestion.audioUrl)
  const isPlaying =
    canPlay
    && engine.playing
    && engine.mode === 'snippet'
    && engine.songId === suggestion.songId
    && engine.snippet?.lineIndex === suggestion.lineIndex
  const isBuffering = isPlaying && engine.buffering

  return (
    <div className="margo-post-card__lb-row">
      <button type="button" onClick={onAccept} className="margo-post-card__lb-row-body">
        <p className="margo-post-card__lb-row-lyric">&ldquo;{suggestion.text}&rdquo;</p>
        <p className="margo-post-card__lb-row-meta">
          <span className="margo-post-card__lb-echo-song">{suggestion.songTitle}</span>
          <span className="margo-post-card__lb-echo-artist">{suggestion.artistName}</span>
        </p>
      </button>
      {canPlay ? (
        <button
          type="button"
          aria-label={isPlaying ? 'Pause suggestion' : 'Play suggestion'}
          className="margo-post-card__lb-row-play"
          onClick={(e) => {
            e.stopPropagation()
            if (isPlaying) {
              togglePlayPause()
              return
            }
            if (!suggestion.audioUrl) return
            void playSnippet({
              songId: suggestion.songId,
              audioUrl: suggestion.audioUrl,
              title: suggestion.songTitle,
              artist: suggestion.artistName,
              artwork: suggestion.artworkUrl ?? null,
              lineIndex: suggestion.lineIndex,
              lineText: suggestion.text,
              startSec: suggestion.startSec,
              endSec: suggestion.endSec,
              vibe: suggestion.vibe,
              source: 'feed',
            })
          }}
        >
          <span className="margo-post-card__lb-row-play-inner">
            <FeedMomentPlaybackIcon playing={isPlaying} buffering={isBuffering} size={16} color="var(--post-vibe-fill)" />
          </span>
        </button>
      ) : null}
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
  const [focusId, setFocusId] = useState(postId)
  const [focusedEcho, setFocusedEcho] = useState<Echo | null>(null)
  const [backToHandle, setBackToHandle] = useState<string | null>(null)
  const [composePrefill, setComposePrefill] = useState<LyricBackPanelPrefill | null>(null)

  useEffect(() => {
    if (!open) {
      setFocusId(postId)
      setFocusedEcho(null)
      setBackToHandle(null)
      setComposePrefill(null)
    }
  }, [open, postId])

  useEffect(() => {
    if (!open) return
    window.setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      composeRef.current?.focusSearch()
    }, 80)
  }, [open, focusId])

  const focusNested = useCallback((echo: Echo) => {
    const parentHandle = focusId === postId
      ? (parentUsername || '').replace(/^@/, '').trim() || 'member'
      : (focusedEcho?.username || '').replace(/^@/, '').trim() || 'member'
    setBackToHandle(parentHandle)
    setFocusId(echo.id)
    setFocusedEcho(echo)
    setComposePrefill(null)
    window.setTimeout(() => composeRef.current?.focusSearch(), 80)
  }, [focusId, focusedEcho?.username, parentUsername, postId])

  const backOneLevel = useCallback(() => {
    setFocusId(postId)
    setFocusedEcho(null)
    setBackToHandle(null)
    setComposePrefill(null)
    window.setTimeout(() => composeRef.current?.focusSearch(), 80)
  }, [postId])

  const replyToUsername = useMemo(() => {
    if (focusId !== postId && focusedEcho) {
      return focusedEcho.username || ''
    }
    return parentUsername || ''
  }, [focusId, focusedEcho, parentUsername, postId])

  if (!open) return null

  return (
    <div
      ref={panelRef}
      data-no-card-nav
      className="margo-post-card__lb-panel"
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
        onBack={backOneLevel}
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
            startSec: s.startSec,
            endSec: s.endSec,
          })
          window.setTimeout(() => composeRef.current?.focusSearch(), 80)
        }}
        showSuggestions
        echoesActive
      />
    </div>
  )
}
