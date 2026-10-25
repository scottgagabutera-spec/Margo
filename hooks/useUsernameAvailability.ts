'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchProfilePeek } from '@/lib/profile-warm'
import { normalizeUsernameInput, validateUsernameChoice } from '@/lib/username-validator'

export type UsernameAvailabilityState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'invalid'

export function useUsernameAvailability(
  rawUsername: string,
  currentUsername: string | null | undefined,
  currentProfileId: string | null | undefined,
) {
  const [state, setState] = useState<UsernameAvailabilityState>('idle')
  const genRef = useRef(0)

  useEffect(() => {
    const cleaned = normalizeUsernameInput(rawUsername)
    const validation = validateUsernameChoice(rawUsername, currentUsername)

    if (!cleaned) {
      setState('idle')
      return
    }

    if (!validation.ok) {
      setState('invalid')
      return
    }

    if (currentUsername && cleaned === normalizeUsernameInput(currentUsername)) {
      setState('available')
      return
    }

    const gen = ++genRef.current
    setState('checking')

    const timer = window.setTimeout(() => {
      void (async () => {
        const peek = await fetchProfilePeek(cleaned)
        if (gen !== genRef.current) return
        if (!peek?.profile?.username) {
          setState('available')
          return
        }
        if (currentProfileId && peek.profile.id === currentProfileId) {
          setState('available')
          return
        }
        setState('taken')
      })()
    }, 320)

    return () => window.clearTimeout(timer)
  }, [rawUsername, currentUsername, currentProfileId])

  return state
}
