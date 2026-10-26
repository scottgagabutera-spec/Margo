'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchProfilePeek } from '@/lib/profile-warm'
import { usernamePeekIndicatesTaken } from '@/lib/username-peek-availability'
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

    if (!cleaned) {
      setState('idle')
      return
    }

    if (currentUsername && cleaned === normalizeUsernameInput(currentUsername)) {
      setState('available')
      return
    }

    const validation = validateUsernameChoice(rawUsername, currentUsername)
    if (!validation.ok) {
      setState('invalid')
      return
    }

    const gen = ++genRef.current
    setState('checking')

    const timer = window.setTimeout(() => {
      void (async () => {
        const peek = await fetchProfilePeek(cleaned)
        if (gen !== genRef.current) return
        if (!usernamePeekIndicatesTaken(peek?.profile ?? null, cleaned, currentUsername, currentProfileId)) {
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
