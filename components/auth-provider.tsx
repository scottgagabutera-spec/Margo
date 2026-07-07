'use client'
import { useEffect } from 'react'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'

/**
 * Mount once at the root of the app (app/layout.tsx).
 * Silently ensures every visitor has a Firebase Auth UID — anonymous at
 * first — the moment they land on Margo, without any button or banner.
 *
 * This UID is what gets upgraded later via linkWithCredential() when
 * someone signs up for real. Nothing about the visible UI changes;
 * this just guarantees authorUid is never null on a post.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!auth) return
    const authInstance = auth // narrowed to non-null for the closure below

    const unsub = onAuthStateChanged(authInstance, (user) => {
      if (!user) {
        // No session at all yet — create one silently.
        signInAnonymously(authInstance).catch((e) => {
          console.error('[AuthProvider] Silent anonymous sign-in failed:', e)
        })
      }
      // If a user already exists (anonymous or upgraded), do nothing —
      // never overwrite an existing session.
    })
    return () => unsub()
  }, [])

  return <>{children}</>
}