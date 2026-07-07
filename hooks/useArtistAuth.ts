'use client'
import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth'
import { ref, set, get, serverTimestamp } from 'firebase/database'

export interface ArtistProfile {
  displayName: string
  email: string
  status: 'active' | 'warned' | 'frozen' | 'removed'
  statusReason?: string
  statusUpdatedAt?: number | object
  agreedToRightsWarranty: boolean
  agreedAt: number | object
  createdAt: number | object
}

export function useArtistAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<ArtistProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth) { setLoading(false); return }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u && db) {
        const snap = await get(ref(db, `artists/${u.uid}`))
        setProfile(snap.exists() ? snap.val() : null)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const signUpArtist = async (
    email: string,
    password: string,
    displayName: string,
    agreedToRightsWarranty: boolean
  ) => {
    if (!auth || !db) throw new Error('Auth not initialized')
    if (!agreedToRightsWarranty) throw new Error('You must agree to the rights warranty to continue')

    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const profileData: ArtistProfile = {
      displayName: displayName.trim(),
      email,
      status: 'active',
      agreedToRightsWarranty: true,
      agreedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }
    await set(ref(db, `artists/${cred.user.uid}`), profileData)
    return cred.user
  }

  const signInArtist = async (email: string, password: string) => {
    if (!auth) throw new Error('Auth not initialized')
    return signInWithEmailAndPassword(auth, email, password)
  }

  const signOutArtist = async () => {
    if (!auth) return
    await signOut(auth)
  }

  return { user, profile, loading, signUpArtist, signInArtist, signOutArtist }
}