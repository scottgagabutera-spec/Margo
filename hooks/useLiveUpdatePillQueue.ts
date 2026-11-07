'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LiveUpdateKind } from '@/lib/live-updates/copy'

const MAX_QUEUE = 4
const COOLDOWN_MS = 30_000
const REMINDER_MS = 17_000
const MAX_REMINDERS = 3

export type LiveUpdateSource = {
  posts: number
  artists: number
  songs: number
  memories: number
}

type QueueItem = { kind: LiveUpdateKind; count: number }

export function useLiveUpdatePillQueue(source: LiveUpdateSource, enabled: boolean) {
  const [active, setActive] = useState<QueueItem | null>(null)
  const [dismissedUntilTap, setDismissedUntilTap] = useState(false)
  const queueRef = useRef<QueueItem[]>([])
  const lastShownRef = useRef<Partial<Record<LiveUpdateKind, { at: number; count: number }>>>({})
  const reminderRef = useRef<Partial<Record<LiveUpdateKind, number>>>({})
  const prevRef = useRef(source)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearReminder = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }

  const showNext = useCallback((item: QueueItem) => {
    lastShownRef.current[item.kind] = { at: Date.now(), count: item.count }
    setActive(item)
    setDismissedUntilTap(false)
  }, [])

  const enqueue = useCallback(
    (kind: LiveUpdateKind, count: number) => {
      if (count <= 0) return
      const now = Date.now()
      const last = lastShownRef.current[kind]
      if (last && now - last.at < COOLDOWN_MS && last.count === count) return

      const q = queueRef.current
      const existing = q.find((x) => x.kind === kind)
      if (existing) existing.count = count
      else if (q.length < MAX_QUEUE) q.push({ kind, count })

      if (!active) {
        const next = q.shift()
        if (next) showNext(next)
      } else if (active.kind === kind) {
        setActive({ kind, count })
      }
    },
    [active, showNext],
  )

  useEffect(() => {
    if (!enabled) return
    const prev = prevRef.current
    ;(['posts', 'artists', 'songs', 'memories'] as LiveUpdateKind[]).forEach((kind) => {
      const next = source[kind]
      const was = prev[kind]
      if (next > was) {
        reminderRef.current[kind] = 0
        enqueue(kind, next)
      }
    })
    prevRef.current = source
  }, [source, enabled, enqueue])

  const scheduleReminder = useCallback(() => {
    clearReminder()
    if (dismissedUntilTap) return
    const total = source.posts + source.artists + source.songs + source.memories
    if (total <= 0) return
    timerRef.current = setTimeout(() => {
      const kinds = (['posts', 'artists', 'songs', 'memories'] as LiveUpdateKind[]).filter((k) => source[k] > 0)
      const kind = kinds[0]
      if (!kind) return
      const n = (reminderRef.current[kind] ?? 0) + 1
      if (n > MAX_REMINDERS) return
      reminderRef.current[kind] = n
      showNext({ kind, count: source[kind] })
    }, REMINDER_MS)
  }, [dismissedUntilTap, showNext, source])

  const dismissActive = useCallback(() => {
    setActive(null)
    setDismissedUntilTap(true)
    const next = queueRef.current.shift()
    if (next) showNext(next)
    else scheduleReminder()
  }, [showNext, scheduleReminder])

  useEffect(() => {
    if (!active) scheduleReminder()
    return clearReminder
  }, [active, scheduleReminder])

  const acknowledge = useCallback(() => {
    setDismissedUntilTap(true)
    clearReminder()
    prevRef.current = { posts: 0, artists: 0, songs: 0, memories: 0 }
    queueRef.current = []
    setActive(null)
  }, [])

  return useMemo(
    () => ({
      active,
      dismissActive,
      acknowledge,
    }),
    [active, dismissActive, acknowledge],
  )
}
