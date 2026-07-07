'use client'
import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth'
import { ref, get, set, serverTimestamp, runTransaction } from 'firebase/database'

export interface ClaimedProfile {
  username: string
  claimedAt: number | object
  createdAt: number | object
}

export interface ClaimResult {
  success: boolean
  error?: string
}

export function useClaimIdentity() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<ClaimedProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)

  useEffect(() => {
    if (!auth) { setLoading(false); return }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u && db) {
        const snap = await get(ref(db, `users/${u.uid}`))
        setProfile(snap.exists() ? snap.val() : null)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const claimIdentity = async (desiredUsername: string): Promise<ClaimResult> => {
    if (!auth || !db) return { success: false, error: 'Not available right now.' }
    setClaiming(true)
    try {
      // Reuses existing anonymous uid if this browser already has one
      const cred = await signInAnonymously(auth)
      const uid = cred.user.uid

      const existing = await get(ref(db, `users/${uid}`))
      if (existing.exists()) {
        setProfile(existing.val())
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

      const newProfile: ClaimedProfile = {
        username: desiredUsername,
        claimedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }
      await set(ref(db, `users/${uid}`), newProfile)
      setProfile(newProfile)

      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message || 'Something went wrong.' }
    } finally {
      setClaiming(false)
    }
  }

  return { user, profile, loading, claimIdentity, claiming }
}