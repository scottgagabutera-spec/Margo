'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { patchProfileSurface, peekProfileSurface } from '@/lib/profile-warm'
import { PROFILE_SURFACE_READY } from '@/lib/profile/surface-ready'
import type { MemoryPublic } from '@/lib/memory/types'

export function useProfileMemories(profileId: string | null, username: string | null) {
  const surfacePeek = username ? peekProfileSurface(username) : null
  const [memories, setMemories] = useState<MemoryPublic[]>(surfacePeek?.memories ?? [])
  const [isOwner, setIsOwner] = useState(surfacePeek?.memoriesIsOwner ?? false)
  const [loading, setLoading] = useState(!surfacePeek && !!(profileId || username))
  const surfaceAppliedRef = useRef(!!surfacePeek)

  const applyPeek = useCallback((uname: string) => {
    const peek = peekProfileSurface(uname)
    if (!peek) return false
    setMemories(peek.memories)
    setIsOwner(peek.memoriesIsOwner)
    setLoading(false)
    surfaceAppliedRef.current = true
    return true
  }, [])

  const refresh = useCallback(async () => {
    if (!profileId && !username) {
      setMemories([])
      setIsOwner(false)
      setLoading(false)
      return
    }
    try {
      const qs = profileId
        ? `profileId=${encodeURIComponent(profileId)}`
        : `username=${encodeURIComponent(username || '')}`
      const res = await fetch(`/api/memories?${qs}`)
      if (!res.ok) return
      const data = (await res.json()) as { memories?: MemoryPublic[]; isOwner?: boolean }
      const next = data.memories || []
      setMemories(next)
      setIsOwner(!!data.isOwner)
      if (username) {
        patchProfileSurface(username, {
          memories: next,
          memoriesIsOwner: !!data.isOwner,
        })
      }
    } finally {
      setLoading(false)
      surfaceAppliedRef.current = true
    }
  }, [profileId, username])

  useEffect(() => {
    if (!profileId && !username) return
    if (username) applyPeek(username)
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
