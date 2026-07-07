'use client'
import { useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { signInAnonymously } from 'firebase/auth'
import { ref, get, set, serverTimestamp, runTransaction } from 'firebase/database'

export interface ClaimResult {
  success: boolean
  error?: string
}

export function useClaimIdentity() {
  const [claiming, setClaiming] = useState(false)

  const claimIdentity = async (desiredUsername: string): Promise<ClaimResult> => {
    if (!auth || !db) return { success: false, error: 'Not available right now.' }
    setClaiming(true)
    try {
      // Reuses existing anonymous uid if this browser already has one
      const cred = await signInAnonymously(auth)
      const uid = cred.user.uid

      const existing = await get(ref(db, `users/${uid}`))
      if (existing.exists()) {
        return { success: true } // already claimed on this browser — nothing to do
      }

      // Atomic reservation — fails safely if someone else already has this name
      const usernameRef = ref(db, `usernames/${desiredUsername}`)
      let reserved = false
      await runTransaction(usernameRef, (current) => {
        if (current === null) { reserved = true; return uid }
        return current // leave untouched, claim fails
      })

      if (!reserved) {
        return { success: false, error: 'That username is already claimed by someone else.' }
      }

      await set(ref(db, `users/${uid}`), {
        username: desiredUsername,
        claimedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      })

      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message || 'Something went wrong.' }
    } finally {
      setClaiming(false)
    }
  }

  return { claimIdentity, claiming }
}