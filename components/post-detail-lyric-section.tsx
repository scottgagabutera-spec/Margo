'use client'

import { useCallback, useRef, type RefObject } from 'react'
import { useLyricBackFocusStack } from '@/hooks/useLyricBackFocusStack'
import {
  LyricBackFocusBody,
  type LyricBackThreadRowExtras,
} from '@/components/lyric-back-focus-panel'
import type { LyricBackPanelComposeHandle } from '@/components/lyric-back-panel-compose'
import type { Post } from '@/hooks/usePosts'
import type { Echo } from '@/hooks/useEchoes'

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

/** Post-page Lyric Backs — same focus body as feed panel (play/listen strips included). */
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
    backToHandle,
    replyToUsername,
  } = stackApi

  const isNested = Boolean(focusId && post.id && focusId !== post.id && focusedEcho)

  return (
    <section
      ref={sectionRef}
      className={`margo-post-detail-lb${isNested ? ' margo-post-detail-lb--thread-focus' : ''}`}
      aria-label="Lyric Backs"
    >
      <LyricBackFocusBody
        variant="post-inline"
        rootPostId={post.id}
        focusId={focusId}
        focusedEcho={focusedEcho}
        backToHandle={backToHandle}
        replyToUsername={replyToUsername || post.username || ''}
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

export function usePostDetailLyricBack(post: Post | null) {
  const authorHandle = typeof post?.username === 'string' ? post.username : ''
  const stackApi = useLyricBackFocusStack(post?.id ?? 'unset', authorHandle)
  const composeRef = useRef<LyricBackPanelComposeHandle>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const mainCardRef = useRef<HTMLElement>(null)

  const scrollLbIntoView = useCallback(() => {
    window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
      composeRef.current?.focusSearch()
    }, 80)
  }, [])

  const scrollMainCardIntoView = useCallback(() => {
    window.setTimeout(() => {
      mainCardRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
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
