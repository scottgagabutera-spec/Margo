'use client'

import { useCallback, useRef, type RefObject } from 'react'
import { useEchoes, type Echo } from '@/hooks/useEchoes'
import { useLyricBackFocusStack } from '@/hooks/useLyricBackFocusStack'
import { LyricBackThreadRow } from '@/components/lyric-back-thread-row'
import { LyricBackReplyContext } from '@/components/lyric-back-reply-context'
import {
  LyricBackFocusBody,
  type LyricBackThreadRowExtras,
} from '@/components/lyric-back-focus-panel'
import {
  LyricBackPanelCompose,
  type LyricBackPanelComposeHandle,
} from '@/components/lyric-back-panel-compose'
import type { Post } from '@/hooks/usePosts'

export type PostDetailLyricSectionProps = {
  post: Post
  echoCount: number
  composeOpen: boolean
  composeRef: RefObject<LyricBackPanelComposeHandle | null>
  sectionRef: RefObject<HTMLElement | null>
  onRequireAuth: () => boolean
  onSent: () => void
  getRowExtras: (echo: Echo) => LyricBackThreadRowExtras
  onExportEcho: (echo: Echo) => void
  onReplayEcho: (id: string) => void
  onOpenThread: (id: string) => void
  onFocusEcho: (echo: Echo) => void
  onBackOneLevel: () => void
  stackApi: ReturnType<typeof useLyricBackFocusStack>
}

/** Post-page Lyric Backs — root path stays simple; nested uses shared focus body. */
export function PostDetailLyricSection({
  post,
  echoCount,
  composeOpen,
  composeRef,
  sectionRef,
  onRequireAuth,
  onSent,
  getRowExtras,
  onExportEcho,
  onReplayEcho,
  onOpenThread,
  onFocusEcho,
  onBackOneLevel,
  stackApi,
}: PostDetailLyricSectionProps) {
  const {
    focusId,
    focusedEcho,
    isNested,
    backToHandle,
    replyToUsername,
  } = stackApi

  const { echoes: rootEchoes, loading: rootLoading } = useEchoes(post.id)
  const displayCount = Math.max(echoCount, rootEchoes.length)

  if (isNested && focusedEcho) {
    return (
      <section
        ref={sectionRef}
        className="margo-post-detail-lb margo-post-detail-lb--thread-focus"
        aria-label="Lyric Backs"
      >
        <LyricBackFocusBody
          variant="post-inline"
          rootPostId={post.id}
          focusId={focusId}
          focusedEcho={focusedEcho}
          backToHandle={backToHandle}
          replyToUsername={replyToUsername}
          parentEmotion={post.emotion || 'chill'}
          echoCountHint={echoCount}
          composeOpen={composeOpen}
          composeRef={composeRef}
          onRequireAuth={onRequireAuth}
          composePrefill={null}
          onSent={onSent}
          onBack={onBackOneLevel}
          onFocusEcho={onFocusEcho}
          onOpenThread={onOpenThread}
          onExportEcho={onExportEcho}
          onReplayEcho={onReplayEcho}
          getRowExtras={getRowExtras}
          echoesActive
        />
      </section>
    )
  }

  return (
    <section
      ref={sectionRef}
      className="margo-post-detail-lb"
      aria-label="Lyric Backs"
    >
      {composeOpen ? (
        <>
          <LyricBackReplyContext username={replyToUsername} />
          <div className="margo-post-detail-lb__compose">
            <LyricBackPanelCompose
              ref={composeRef}
              key={post.id}
              layout="panel"
              parentPostId={post.id}
              parentEmotion={post.emotion || 'chill'}
              onRequireAuth={onRequireAuth}
              focusSearchOnMount
              onSent={onSent}
            />
          </div>
        </>
      ) : null}

      {rootEchoes.length > 0 || displayCount > 0 ? (
        <>
          <div className="margo-post-detail-lb__divider" aria-hidden />
          <h2 className="margo-post-detail-lb__heading">
            Lyric Backs · {displayCount}
          </h2>
        </>
      ) : null}

      {rootLoading ? (
        <p className="margo-post-detail-lb__loading" aria-live="polite">Loading Lyric Backs…</p>
      ) : null}

      {!rootLoading && rootEchoes.length > 0 ? (
        <ul className="margo-post-thread-list">
          {rootEchoes.map((echo) => (
            <li key={echo.id}>
              <LyricBackThreadRow
                echo={echo}
                tone="reply"
                {...getRowExtras(echo)}
                onLyricBack={() => onFocusEcho(echo)}
                onOpenThread={onOpenThread}
                onExport={onExportEcho}
                onReplay={onReplayEcho}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {composeOpen && !rootLoading && rootEchoes.length === 0 ? (
        <p className="margo-post-detail-lb__empty-hint">
          Be the first Lyric Back on this moment.
        </p>
      ) : null}
    </section>
  )
}

export function usePostDetailLyricBack(post: Post | null) {
  const stackApi = useLyricBackFocusStack(post?.id ?? 'unset', post?.username ?? '')
  const composeRef = useRef<LyricBackPanelComposeHandle>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const mainCardRef = useRef<HTMLElement>(null)

  const scrollLbIntoView = useCallback(() => {
    window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      composeRef.current?.focusSearch()
    }, 80)
  }, [])

  const scrollMainCardIntoView = useCallback(() => {
    window.setTimeout(() => {
      mainCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 80)
  }, [])

  return {
    stackApi,
    composeRef,
    sectionRef,
    mainCardRef,
    scrollLbIntoView,
    scrollMainCardIntoView,
  }
}
