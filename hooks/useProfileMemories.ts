'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  peekProfileCache,
  peekProfileSurface,
  profileHasRenderableCache,
  refreshProfileSurfaceIfStale,
  revalidateProfileSurface,
  warmProfile,
} from '@/lib/profile-warm'
import { PROFILE_SURFACE_READY } from '@/lib/profile/surface-ready'
import type { MemoryPublic } from '@/lib/memory/types'

function cachedSurfacePeek(username: string | null) {
  return username ? peekProfileSurface(username) : null
}

export function useProfileMemories(profileId: string | null, username: string | null) {
  const surfacePeek = cachedSurfacePeek(username)
  const [memories, setMemories] = useState<MemoryPublic[]>(surfacePeek?.memories ?? [])
  const [isOwner, setIsOwner] = useState(surfacePeek?.memoriesIsOwner ?? false)
  const [loading, setLoading] = useState(
    () => !!(profileId || username) && !(username && peekProfileCache(username)?.surfaceLoadedAt),
  )

  const applyPeek = useCallback((uname: string) => {
    const peek = peekProfileSurface(uname)
    if (!peek) return false
    setMemories(peek.memories)
    setIsOwner(peek.memoriesIsOwner)
    setLoading(false)
    return true
  }, [])

  const refresh = useCallback(async () => {
    if (!username) return
    await revalidateProfileSurface(username)
    applyPeek(username)
  }, [applyPeek, username])

  useEffect(() => {
    if (!profileId && !username) {
      setMemories([])
      setIsOwner(false)
      setLoading(false)
      return
    }
    if (username) {
      if (applyPeek(username)) {
        void refreshProfileSurfaceIfStale(username)
      } else if (profileHasRenderableCache(username)) {
        setLoading(false)
      }
      void warmProfile(username)
    }
  }, [profileId, username, applyPeek])

  useEffect(() => {
    if (!username) return
    const onSurface = (e: Event) => {
      const detail = (e as CustomEvent<{ username?: string }>).detail
      if (detail?.username !== username.toLowerCase()) return
      applyPeek(username)
    }
    window.addEventListener(PROFILE_SURFACE_READY, onSurface)
    return () => window.removeEventListener(PROFILE_SURFACE_READY, onSurface)
  }, [username, applyPeek])

  return { memories, isOwner, loading, refresh }
}
