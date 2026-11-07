'use client'

import { useEffect, useRef, useState } from 'react'
import type { MemoryPublic } from '@/lib/memory/types'

const FEED_MEMORIES_STALE_MS = 90_000

export function useFeedMemories(enabled: boolean) {
  const [memories, setMemories] = useState<MemoryPublic[]>([])
  const [loading, setLoading] = useState(false)
  const loadedAtRef = useRef(0)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const stale = Date.now() - loadedAtRef.current > FEED_MEMORIES_STALE_MS
    if (loadedAtRef.current > 0 && !stale) return

    const run = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/memories/feed?limit=24')
        if (!res.ok) return
        const data = (await res.json()) as { memories?: MemoryPublic[] }
        if (cancelled) return
        setMemories(data.memories || [])
        loadedAtRef.current = Date.now()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => { cancelled = true }
  }, [enabled])

  return { memories, loading }
}
