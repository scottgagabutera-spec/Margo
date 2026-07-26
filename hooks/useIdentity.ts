'use client'
import { useState, useEffect, useCallback } from 'react'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { ref, get, set, update, serverTimestamp, runTransaction } from 'firebase/database'

const INSTRUMENTS = [
  'guitar', 'piano', 'violin', 'cello', 'drums', 'bass', 'flute', 'harp',
  'trumpet', 'sitar', 'viola', 'banjo', 'saxophone', 'clarinet', 'ukulele',
  'organ', 'synth', 'mandolin', 'trombone',
]

function generateUsername() {
  const instrument = INSTRUMENTS[Math.floor(Math.random() * INSTRUMENTS.length)]
  const number = Math.floor(Math.random() * 9000) + 1000
  return `${instrument}${number}`
}

export interface ArtistApplicationLinks {
  spotify?: string
  youtube?: string
  soundcloud?: string
  instagram?: string
  tiktok?: string
  other?: string
}

export interface ArtistApplication {
  status: 'none' | 'pending' | 'approved' | 'rejected'
  displayArtistName: string
  links: ArtistApplicationLinks
  note?: string
  rightsAgreed: boolean
  submittedAt: number | object
  reviewedAt?: number | object
}

export interface Identity {
  username: string      // unique @handle — lowercase, alphanumeric + underscore only
  displayName: string    // free text, shown on posts/profile — not unique
  email: string | null
  isArtist: boolean
  artistApplication?: ArtistApplication
  createdAt: number | object
}

interface ActionResult {
  success: boolean
  error?: string
}

/**
 * Unified identity system. Replaces useUsername (localStorage) and
 * useClaimIdentity (Firebase-only) with a single Firebase-backed model.
 *
 * Relies on AuthProvider already having created an anonymous UID for
 * every visitor. The first time that UID is seen here, a users/{uid}
 * profile is auto-created with a generated default username — no
 * button, no banner required. Later, real sign-up (linkWithCredential)
 * upgrades the same UID in place; this hook doesn't need to change
 * for that to work, since it only ever reads/writes users/{uid}.
 *
 * "Artist" is not a separate account or auth system — it's a role a
 * signed-up user can apply for. isArtist flips to true once an
 * artistApplication is approved (reviewed manually for now).
 */
export function useIdentity() {
  const [user, setUser] = useState<User | null>(null)
  const [identity, setIdentityState] = useState<Identity | null>(null)
  const [loading, setLoading] = useState(true)

  // Atomic username reservation — fails safely on collision.
  const reserveUsername = useCallback(async (uid: string, desired: string): Promise<boolean> => {
    if (!db) return false
    let reserved = false
    await runTransaction(ref(db, `usernames/${desired}`), (current) => {
      if (current === null) {
        reserved = true
        return uid
      }
      return current // leave untouched — reservation fails
    })
    return reserved
  }, [])

  // Ensure a users/{uid} profile exists. Auto-creates one with a
  // generated + reserved username the first time this UID is seen.
  const ensureProfile = useCallback(async (u: User) => {
    if (!db) return
    const profileRef = ref(db, `users/${u.uid}`)
    const snap = await get(profileRef)
    if (snap.exists()) {
      setIdentityState(snap.val())
      return
    }

    // First time seeing this UID — generate + reserve a default
    // username, retrying a few times in the rare case of collision.
    let username = generateUsername()
    let reserved = false
    for (let attempts = 0; attempts < 5 && !reserved; attempts++) {
      reserved = await reserveUsername(u.uid, username)
      if (!reserved) username = generateUsername()
    }

    const newIdentity: Identity = {
      username,
      displayName: username,
      email: u.email,
      isArtist: false,
      createdAt: serverTimestamp(),
    }
    await set(profileRef, newIdentity)
    setIdentityState(newIdentity)
  }, [reserveUsername])

  useEffect(() => {
    if (!auth) { setLoading(false); return }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        await ensureProfile(u)
      } else {
        setIdentityState(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [ensureProfile])

  // Free-text display name — no uniqueness constraint, editable anytime.
  const updateDisplayName = useCallback(async (newName: string): Promise<ActionResult> => {
    if (!user || !db) return { success: false, error: 'Not signed in.' }
    const trimmed = newName.trim().slice(0, 30)
    if (!trimmed) return { success: false, error: 'Name cannot be empty.' }
    await update(ref(db, `users/${user.uid}`), { displayName: trimmed })
    setIdentityState(prev => (prev ? { ...prev, displayName: trimmed } : prev))
    return { success: true }
  }, [user])

  // Change the unique @handle. Releases the old reservation on success.
  const changeUsername = useCallback(async (newUsername: string): Promise<ActionResult> => {
    if (!user || !db || !identity) return { success: false, error: 'Not signed in.' }
    const cleaned = newUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (cleaned.length < 3) return { success: false, error: 'Username must be at least 3 characters.' }
    if (cleaned === identity.username) return { success: true }

    const reserved = await reserveUsername(user.uid, cleaned)
    if (!reserved) return { success: false, error: 'That username is already taken.' }

    await set(ref(db, `usernames/${identity.username}`), null) // release old handle
    await update(ref(db, `users/${user.uid}`), { username: cleaned })
    setIdentityState(prev => (prev ? { ...prev, username: cleaned } : prev))
    return { success: true }
  }, [user, identity, reserveUsername])

  // Submit (or resubmit, if previously rejected) an artist application.
  // Only writes the artistApplication field — never touches isArtist,
  // username, displayName, or anything else on the profile.
  const submitArtistApplication = useCallback(async (
    data: { displayArtistName: string; links: ArtistApplicationLinks; note?: string; rightsAgreed: boolean }
  ): Promise<ActionResult> => {
    if (!user || !db) return { success: false, error: 'Not signed in.' }

    const name = data.displayArtistName.trim()
    if (!name) return { success: false, error: 'Artist name is required.' }

    const hasLink = Object.values(data.links).some(v => v && v.trim().length > 0)
    if (!hasLink) return { success: false, error: 'Add at least one link so we can verify you.' }

    if (!data.rightsAgreed) {
      return { success: false, error: 'You must agree to the rights warranty to continue.' }
    }

    const cleanedLinks: ArtistApplicationLinks = {}
    for (const [key, value] of Object.entries(data.links)) {
      if (value && value.trim()) cleanedLinks[key as keyof ArtistApplicationLinks] = value.trim()
    }

    const application: ArtistApplication = {
      status: 'pending',
      displayArtistName: name,
      links: cleanedLinks,
      note: data.note?.trim() || undefined,
      rightsAgreed: true,
      submittedAt: serverTimestamp(),
    }

    await update(ref(db, `users/${user.uid}`), { artistApplication: application })
    setIdentityState(prev => (prev ? { ...prev, artistApplication: application } : prev))
    return { success: true }
  }, [user])

  return { user, identity, loading, updateDisplayName, changeUsername, submitArtistApplication }
}