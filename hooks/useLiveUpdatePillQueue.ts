'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LiveUpdateKind } from '@/lib/live-updates/copy'

const MAX_QUEUE = 4
const COOLDOWN_MS = 30_000

export type LiveUpdateSource = {
  posts: number
  artists: number
  songs: number
  memories: number
}

type QueueItem = { kind: LiveUpdateKind; count: number }

export function useLiveUpdatePillQueue(source: LiveUpdateSource, enabled: boolean) {
  const [active, setActive] = useState<QueueItem | null>(null)
  const queueRef = useRef<QueueItem[]>([])
  const lastShownRef = useRef<Partial<Record<LiveUpdateKind, { at: number; count: number }>>>({})
  const prevRef = useRef(source)

  const enqueue = useCallback((kind: LiveUpdateKind, count: number) => {
    if (count <= 0) return
    const now = Date.now()
    const last = lastShownRef.current[kind]
    if (last && now - last.at < COOLDOWN_MS && last.count === count) return

    const q = queueRef.current
    const existing = q.find((x) => x.kind === kind)
    if (existing) {
      existing.count = count
    } else if (q.length < MAX_QUEUE) {
      q.push({ kind, count })
    }

    if (!active) {
      const next = q.shift() ?? null
      if (next) {
        lastShownRef.current[next.kind] = { at: now, count: next.count }
        setActive(next)
      }
    }
  }, [active])

  useEffect(() => {
    if (!enabled) return
    const prev = prevRef.current
    ;(['posts', 'artists', 'songs', 'memories'] as LiveUpdateKind[]).forEach((kind) => {
      const next = source[kind]
      const was = prev[kind]
      if (next > was) enqueue(kind, next)
    })
    prevRef.current = source
  }, [source, enabled, enqueue])

  const dismissActive = useCallback(() => {
    setActive(null)
    const next = queueRef.current.shift() ?? null
    if (next) {
      lastShownRef.current[next.kind] = { at: Date.now(), count: next.count }
      setActive(next)
    }
  }, [])

  return useMemo(
    () => ({
      active,
      dismissActive,
    }),
    [active, dismissActive],
  )
}
