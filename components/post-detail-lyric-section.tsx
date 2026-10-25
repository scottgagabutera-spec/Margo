'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { scrollPostLyricBackSectionIntoView } from '@/lib/lyric-back-panel-scroll'
import { usePathname } from 'next/navigation'
import { useLyricBackFocusStack, type LyricBackStackOptions } from '@/hooks/useLyricBackFocusStack'
import {
  LyricBackFocusBody,
  type LyricBackThreadRowExtras,
} from '@/components/lyric-back-focus-panel'
import type { LyricBackPanelComposeHandle } from '@/components/lyric-back-panel-compose'
import type { Post } from '@/hooks/usePosts'
import type { Echo } from '@/hooks/useEchoes'
import { getVibeTheme, vibeThemeStyleVars } from '@/lib/vibe-theme'
import {
  clearLyricBackKeyboardChrome,
  useLyricBackPanelViewport,
} from '@/hooks/useLyricBackPanelViewport'

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
  onEchoCountDelta?: (delta: number) => void
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
  onEchoCountDelta,
}: PostDetailLyricSectionProps) {
  const {
    focusId,
    focusedEcho,
    replyToUsername,
    canReply,
    visualStep,
    applyOwnerDeleteOutcome: applyStackOwnerDelete,
    applyOwnerEditOutcome: applyStackOwnerEdit,
  } = stackApi

  const [echoCountLive, setEchoCountLive] = useState(echoCount)
  useEffect(() => {
    setEchoCountLive(echoCount)
  }, [echoCount, post.id])

  const handleEchoCountDelta = useCallback(
    (delta: number) => {
      setEchoCountLive((n) => Math.max(0, n + delta))
      onEchoCountDelta?.(delta)
    },
    [onEchoCountDelta],
  )

  const pathname = usePathname()
  const isNested = Boolean(focusId && post.id && focusId !== post.id && focusedEcho)
  const vibeTheme = getVibeTheme(post.emotion || 'chill')

  useLyricBackPanelViewport(sectionRef, composeOpen)

  useLayoutEffect(() => {
    if (!composeOpen) return
    const firstReply = !isNested && echoCountLive === 0
    if (firstReply) return
    scrollPostLyricBackSectionIntoView(sectionRef.current)
    const frame = window.requestAnimationFrame(() => {
      if (!isNested && echoCountLive === 0) return
      scrollPostLyricBackSectionIntoView(sectionRef.current)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [composeOpen, focusId, sectionRef, isNested, echoCountLive])

  useEffect(() => {
    if (!composeOpen) clearLyricBackKeyboardChrome()
  }, [composeOpen])

  useEffect(() => {
    clearLyricBackKeyboardChrome()
  }, [post.id, pathname])

  useEffect(() => {
    const onPageHide = () => clearLyricBackKeyboardChrome()
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      clearLyricBackKeyboardChrome()
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className={`margo-post-detail-lb${isNested ? ' margo-post-detail-lb--thread-focus' : ''}`}
      aria-label="Lyric Backs"
      style={vibeThemeStyleVars(vibeTheme)}
    >
      <LyricBackFocusBody
        variant="post-inline"
        rootPostId={post.id}
        focusId={focusId}
        focusedEcho={focusedEcho}
        replyToUsername={replyToUsername || post.username || ''}
        parentEmotion={post.emotion || 'chill'}
        echoCountHint={echoCountLive}
        canReply={canReply}
        visualStep={visualStep}
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
        onEchoCountDelta={handleEchoCountDelta}
        onStackOwnerDelete={applyStackOwnerDelete}
        onStackOwnerEdit={applyStackOwnerEdit}
      />
    </section>
  )
}

export function usePostDetailLyricBack(
  post: Post | null,
  depthOffset = 0,
  options?: LyricBackStackOptions,
) {
  const authorHandle = typeof post?.username === 'string' ? post.username : ''
  const stackApi = useLyricBackFocusStack(post?.id ?? 'unset', authorHandle, depthOffset, options)
  const composeRef = useRef<LyricBackPanelComposeHandle>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const mainCardRef = useRef<HTMLElement>(null)

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
    scrollMainCardIntoView,
  }
}
