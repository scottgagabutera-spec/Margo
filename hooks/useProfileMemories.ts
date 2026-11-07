'use client'

import { useCallback, useEffect, useState } from 'react'
import { peekProfileSurface } from '@/lib/profile-warm'
import type { MemoryPublic } from '@/lib/memory/types'

export function useProfileMemories(profileId: string | null, username: string | null) {
  const surfacePeek = username ? peekProfileSurface(username) : null
  const [memories, setMemories] = useState<MemoryPublic[]>(surfacePeek?.memories ?? [])
  const [isOwner, setIsOwner] = useState(surfacePeek?.memoriesIsOwner ?? false)
  const [loading, setLoading] = useState(!(surfacePeek?.memories.length) && !!(profileId || username))

  const refresh = useCallback(async () => {
    if (!profileId && !username) {
      setMemories([])
      setIsOwner(false)
      return
    }
    try {
      const qs = profileId
        ? `profileId=${encodeURIComponent(profileId)}`
        : `username=${encodeURIComponent(username || '')}`
      const res = await fetch(`/api/memories?${qs}`)
      if (!res.ok) return
      const data = (await res.json()) as { memories?: MemoryPublic[]; isOwner?: boolean }
      setMemories(data.memories || [])
      setIsOwner(!!data.isOwner)
    } finally {
      setLoading(false)
    }
  }, [profileId, username])

  useEffect(() => {
    if (!profileId && !username) return
    const peek = username ? peekProfileSurface(username) : null
    if (peek?.memories.length) {
      setMemories(peek.memories)
      setIsOwner(peek.memoriesIsOwner)
      setLoading(false)
    }
    void refresh()
  }, [profileId, username, refresh])

  return { memories, isOwner, loading, refresh }
}
