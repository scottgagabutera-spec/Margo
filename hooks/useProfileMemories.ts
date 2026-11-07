'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { peekProfileSurface } from '@/lib/profile-warm'
import { PROFILE_SURFACE_READY } from '@/lib/profile/surface-ready'
import type { MemoryPublic } from '@/lib/memory/types'

const PROFILE_MEMORIES_STALE_MS = 90_000

export function useProfileMemories(profileId: string | null, username: string | null) {
  const surfacePeek = username ? peekProfileSurface(username) : null
  const [memories, setMemories] = useState<MemoryPublic[]>(surfacePeek?.memories ?? [])
  const [isOwner, setIsOwner] = useState(surfacePeek?.memoriesIsOwner ?? false)
  const [loading, setLoading] = useState(!surfacePeek?.memories?.length && !!(profileId || username))
  const loadedAtRef = useRef(surfacePeek?.memories?.length ? Date.now() : 0)

  const applyPeek = useCallback((uname: string) => {
    const peek = peekProfileSurface(uname)
    if (!peek?.memories?.length) return false
    setMemories(peek.memories)
    setIsOwner(peek.memoriesIsOwner)
    setLoading(false)
    loadedAtRef.current = Date.now()
    return true
  }, [])

  const refresh = useCallback(async (force = false) => {
    if (!profileId && !username) {
      setMemories([])
      setIsOwner(false)
      return
    }
    const stale = force || Date.now() - loadedAtRef.current > PROFILE_MEMORIES_STALE_MS
    if (!stale && loadedAtRef.current > 0) return
    try {
      const qs = profileId
        ? `profileId=${encodeURIComponent(profileId)}`
        : `username=${encodeURIComponent(username || '')}`
      const res = await fetch(`/api/memories?${qs}`)
      if (!res.ok) return
      const data = (await res.json()) as { memories?: MemoryPublic[]; isOwner?: boolean }
      setMemories(data.memories || [])
      setIsOwner(!!data.isOwner)
      loadedAtRef.current = Date.now()
    } finally {
      setLoading(false)
    }
  }, [profileId, username])

  useEffect(() => {
    if (!profileId && !username) return
    if (username) applyPeek(username)
    void refresh(false)
  }, [profileId, username, refresh, applyPeek])

  useEffect(() => {
    if (!username) return
    const onSurface = (e: Event) => {
      const detail = (e as CustomEvent<{ username?: string }>).detail
      if (detail?.username !== username.toLowerCase()) return
      if (applyPeek(username)) void refresh(true)
    }
    window.addEventListener(PROFILE_SURFACE_READY, onSurface)
    return () => window.removeEventListener(PROFILE_SURFACE_READY, onSurface)
  }, [username, applyPeek, refresh])

  return { memories, isOwner, loading, refresh: () => refresh(true) }
}
