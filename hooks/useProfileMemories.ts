'use client'

import { useCallback, useEffect, useState } from 'react'
import type { MemoryPublic } from '@/lib/memory/types'

export function useProfileMemories(profileId: string | null, username: string | null) {
  const [memories, setMemories] = useState<MemoryPublic[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!profileId && !username) {
      setMemories([])
      return
    }
    setLoading(true)
    try {
      const qs = profileId
        ? `profileId=${encodeURIComponent(profileId)}`
        : `username=${encodeURIComponent(username || '')}`
      const res = await fetch(`/api/memories?${qs}`)
      if (!res.ok) {
        setMemories([])
        return
      }
      const data = (await res.json()) as { memories?: MemoryPublic[]; isOwner?: boolean }
      setMemories(data.memories || [])
      setIsOwner(!!data.isOwner)
    } finally {
      setLoading(false)
    }
  }, [profileId, username])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { memories, isOwner, loading, refresh }
}
