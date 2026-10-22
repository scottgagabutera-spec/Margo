'use client'

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Echo } from '@/hooks/useEchoes'
import {
  lyricBackCanReply,
  lyricBackDepth,
  lyricBackVisualStep,
  reduceLyricBackStack,
} from '@/lib/lyric-back-depth'

/** A second Back from the same tap is ignored until this elapses. */
const BACK_GESTURE_LOCK_MS = 400

type HistoryMarker = {
  margoLbNonce: number
  /** 0 is the open panel. 1 is the first Lyric Back, and so on. */
  depth: number
}

export type LyricBackStackOptions = {
  /** Each nested level gets one history entry while this is true. */
  history?: boolean
  /** Android back on the root panel. Same close as the panel's own close. */
  onExit?: () => void
}

function isOurMarker(state: unknown, nonce: number): state is HistoryMarker {
  if (!state || typeof state !== 'object') return false
  const marker = state as Partial<HistoryMarker>
  return marker.margoLbNonce === nonce && typeof marker.depth === 'number'
}

/**
 * One-level-up back targets and arbitrary depth drill-down (Threads / Reddit reply focus).
 * Reply loading never touches this stack.
 */
export function useLyricBackFocusStack(
  rootPostId: string,
  rootAuthorUsername: string,
  depthOffset = 0,
  options?: LyricBackStackOptions,
) {
  const [stack, setStack] = useState<Echo[]>([])
  const [stackRootId, setStackRootId] = useState(rootPostId)
  if (rootPostId !== stackRootId) {
    setStackRootId(rootPostId)
    setStack([])
  }
  const stackRef = useRef(stack)
  stackRef.current = stack
  const depthOffsetRef = useRef(depthOffset)
  depthOffsetRef.current = depthOffset
  const historyOn = Boolean(options?.history)
  const historyRef = useRef(historyOn)
  historyRef.current = historyOn
  const onExitRef = useRef(options?.onExit)
  onExitRef.current = options?.onExit
  const nonceRef = useRef(0)
  if (nonceRef.current === 0) nonceRef.current = Math.floor(Math.random() * 1_000_000_000) + 1
  const pushedRef = useRef(0)
  const suppressRef = useRef(0)
  const backGuardRef = useRef(false)
  const guardTokenRef = useRef(0)
  const navDirectionRef = useRef<'forward' | 'back'>('forward')

  const commit = useCallback((next: Echo[]) => {
    stackRef.current = next
    setStack(next)
  }, [])

  const focusId = stack.length > 0 ? stack[stack.length - 1].id : rootPostId
  const focusedEcho = stack.length > 0 ? stack[stack.length - 1] : null
  const isNested = stack.length > 0
  const depth = lyricBackDepth(depthOffset, stack.length)
  const canReply = lyricBackCanReply(depth)
  const visualStep = lyricBackVisualStep(stack.length)

  const replyToUsername = useMemo(() => {
    if (focusedEcho) return focusedEcho.username || ''
    return rootAuthorUsername
  }, [focusedEcho, rootAuthorUsername])

  const syncToDepth = useCallback((nextDepth: number) => {
    commit(reduceLyricBackStack(stackRef.current, { type: 'truncate', depth: nextDepth }))
  }, [commit])

  const armBackGuard = useCallback(() => {
    backGuardRef.current = true
    const token = guardTokenRef.current + 1
    guardTokenRef.current = token
    window.setTimeout(() => {
      if (guardTokenRef.current === token) backGuardRef.current = false
    }, BACK_GESTURE_LOCK_MS)
  }, [])

  const drillInto = useCallback((echo: Echo) => {
    if (backGuardRef.current) return
    const next = reduceLyricBackStack(stackRef.current, {
      type: 'drill',
      echo,
      depthOffset: depthOffsetRef.current,
    })
    if (next === stackRef.current) return
    navDirectionRef.current = 'forward'
    commit(next)
    if (!historyRef.current || typeof history === 'undefined' || pushedRef.current === 0) return
    pushedRef.current += 1
    const marker: HistoryMarker = { margoLbNonce: nonceRef.current, depth: next.length }
    history.pushState(marker, '')
  }, [commit])

  const backOneLevel = useCallback(() => {
    const next = reduceLyricBackStack(stackRef.current, { type: 'back' })
    if (next === stackRef.current) return
    navDirectionRef.current = 'back'
    commit(next)
  }, [commit])

  const resetStack = useCallback(() => {
    navDirectionRef.current = 'forward'
    commit([])
  }, [commit])

  const collapseToRoot = useCallback(() => {
    const hadLevels = stackRef.current.length > 0
    navDirectionRef.current = hadLevels ? 'back' : 'forward'
    commit([])
    if (!historyRef.current || typeof history === 'undefined') return
    const extra = Math.max(0, pushedRef.current - 1)
    if (extra === 0) return
    if (!isOurMarker(history.state, nonceRef.current)) return
    suppressRef.current += 1
    pushedRef.current = 1
    history.go(-extra)
  }, [commit])

  useLayoutEffect(() => {
    if (!historyOn || !rootPostId || rootPostId === 'unset' || typeof history === 'undefined') return
    const nonce = nonceRef.current
    const marker = (depth: number): HistoryMarker => ({ margoLbNonce: nonce, depth })
    const previousRestoration = history.scrollRestoration
    history.scrollRestoration = 'manual'
    history.pushState(marker(0), '')
    pushedRef.current = 1
    const target = stackRef.current.length
    for (let depth = 1; depth <= target; depth += 1) {
      history.pushState(marker(depth), '')
      pushedRef.current += 1
    }

    const onPop = (event: PopStateEvent) => {
      const ours = isOurMarker(event.state, nonce)
      if (ours) event.stopImmediatePropagation()
      if (suppressRef.current > 0) {
        suppressRef.current -= 1
        return
      }
      if (ours) {
        navDirectionRef.current = 'back'
        pushedRef.current = event.state.depth + 1
        syncToDepth(event.state.depth)
        return
      }
      pushedRef.current = 0
      navDirectionRef.current = 'forward'
      commit([])
      onExitRef.current?.()
    }
    window.addEventListener('popstate', onPop, true)
    return () => {
      window.removeEventListener('popstate', onPop, true)
      history.scrollRestoration = previousRestoration
      const n = pushedRef.current
      pushedRef.current = 0
      if (n > 0 && isOurMarker(history.state, nonce)) history.go(-n)
    }
  }, [historyOn, rootPostId, commit, syncToDepth])

  const requestBack = useCallback(() => {
    if (stackRef.current.length === 0) return
    if (backGuardRef.current) return
    armBackGuard()
    navDirectionRef.current = 'back'
    const state = typeof history === 'undefined' ? null : history.state
    const canUseHistory = historyRef.current
      && typeof history !== 'undefined'
      && pushedRef.current > 1
      && isOurMarker(state, nonceRef.current)
    if (canUseHistory) {
      history.back()
      return
    }
    backOneLevel()
  }, [armBackGuard, backOneLevel])

  return {
    focusId,
    focusedEcho,
    isNested,
    depth,
    canReply,
    visualStep,
    replyToUsername,
    drillInto,
    backOneLevel,
    requestBack,
    resetStack,
    collapseToRoot,
    navDirectionRef,
  }
}
