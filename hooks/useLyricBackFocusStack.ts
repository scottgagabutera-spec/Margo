'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Echo } from '@/hooks/useEchoes'

function stripHandle(username: string): string {
  return username.replace(/^@/, '').trim() || 'member'
}

/**
 * One-level-up back targets and arbitrary depth drill-down (Threads / Reddit reply focus).
 */
export function useLyricBackFocusStack(rootPostId: string, rootAuthorUsername: string) {
  const [stack, setStack] = useState<Echo[]>([])

  useEffect(() => {
    if (!rootPostId || rootPostId === 'unset') return
    setStack([])
  }, [rootPostId])

  const focusId = stack.length > 0 ? stack[stack.length - 1].id : rootPostId
  const focusedEcho = stack.length > 0 ? stack[stack.length - 1] : null
  const isNested = stack.length > 0

  const backToHandle = useMemo(() => {
    if (stack.length === 0) return null
    if (stack.length === 1) return stripHandle(rootAuthorUsername)
    return stripHandle(stack[stack.length - 2].username || '')
  }, [rootAuthorUsername, stack])

  const replyToUsername = useMemo(() => {
    if (focusedEcho) return focusedEcho.username || ''
    return rootAuthorUsername
  }, [focusedEcho, rootAuthorUsername])

  const drillInto = useCallback((echo: Echo) => {
    setStack((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].id === echo.id) return prev
      return [...prev, echo]
    })
  }, [])

  const backOneLevel = useCallback(() => {
    setStack((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev))
  }, [])

  const resetStack = useCallback(() => {
    setStack([])
  }, [])

  return {
    focusId,
    focusedEcho,
    isNested,
    backToHandle,
    replyToUsername,
    drillInto,
    backOneLevel,
    resetStack,
  }
}
