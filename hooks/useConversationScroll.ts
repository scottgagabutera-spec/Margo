'use client'

import { useCallback, useEffect, useRef } from 'react'

const NEAR_BOTTOM_PX = 120

export interface UseConversationScrollOptions {
  /** Partner resolved and thread is ready to display messages. */
  ready: boolean
  loading: boolean
  messagesLength: number
  keyboardOpen: boolean
}

/**
 * Scroll policy for a dedicated conversation list container.
 * Does not force-scroll when the user has scrolled up to read history.
 */
export function useConversationScroll({
  ready,
  loading,
  messagesLength,
  keyboardOpen,
}: UseConversationScrollOptions) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const initialScrolledRef = useRef(false)

  const distanceFromBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return 0
    return el.scrollHeight - el.scrollTop - el.clientHeight
  }, [])

  const scrollToLatest = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
    isNearBottomRef.current = true
  }, [])

  const handleScroll = useCallback(() => {
    isNearBottomRef.current = distanceFromBottom() <= NEAR_BOTTOM_PX
  }, [distanceFromBottom])

  /** After the user sends — always show the latest message. */
  const scrollToLatestAfterSend = useCallback(() => {
    requestAnimationFrame(() => scrollToLatest('smooth'))
  }, [scrollToLatest])

  // Initial load: partner + messages rendered
  useEffect(() => {
    if (!ready || loading) return
    if (initialScrolledRef.current) return
    const id = requestAnimationFrame(() => {
      scrollToLatest('auto')
      initialScrolledRef.current = true
    })
    return () => cancelAnimationFrame(id)
  }, [ready, loading, messagesLength, scrollToLatest])

  // Incoming messages while following the conversation
  useEffect(() => {
    if (!initialScrolledRef.current) return
    if (!isNearBottomRef.current) return
    const id = requestAnimationFrame(() => scrollToLatest('smooth'))
    return () => cancelAnimationFrame(id)
  }, [messagesLength, scrollToLatest])

  // Keyboard / composer appearance while near bottom
  useEffect(() => {
    if (!initialScrolledRef.current) return
    if (!keyboardOpen) return
    if (!isNearBottomRef.current) return
    const id = requestAnimationFrame(() => scrollToLatest('auto'))
    return () => cancelAnimationFrame(id)
  }, [keyboardOpen, scrollToLatest])

  // Composer height / viewport changes (--margo-cta-bar-h updates)
  useEffect(() => {
    const onViewportChange = () => {
      if (!initialScrolledRef.current) return
      if (!isNearBottomRef.current) return
      scrollToLatest('auto')
    }
    window.visualViewport?.addEventListener('resize', onViewportChange)
    window.addEventListener('resize', onViewportChange)
    return () => {
      window.visualViewport?.removeEventListener('resize', onViewportChange)
      window.removeEventListener('resize', onViewportChange)
    }
  }, [scrollToLatest])

  return {
    scrollRef,
    handleScroll,
    scrollToLatestAfterSend,
  }
}
