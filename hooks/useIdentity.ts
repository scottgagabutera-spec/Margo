'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

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

export interface Identity {
  username: string
  displayName: string
  isArtist: boolean
  isPrivate: boolean
  bio: string | null
  avatarUrl: string | null
  signatureLyric: string | null
  signatureSong: string | null
  signatureArtist: string | null
  createdAt: string
}

interface IdentityUser {
  uid: string
  id: string
  email: string | null
  isAnonymous: boolean
}

interface ActionResult {
  success: boolean
  error?: string
}

function mapRow(row: any): Identity {
  return {
    username: row.username,
    displayName: row.display_name,
    isArtist: row.is_artist,
    isPrivate: row.is_private,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    signatureLyric: row.signature_lyric,
    signatureSong: row.signature_song,
    signatureArtist: row.signature_artist,
    createdAt: row.created_at,
  }
}

/**
 * Supabase-backed identity system. Reads/writes the `profiles` table.
 * Replaces the old Firebase-backed useIdentity.ts, which wrote to
 * users/{uid} in Firebase RTDB — that system is now retired.
 *
 * Relies on SupabaseAuthProvider already having a session (anonymous
 * or real) by the time this runs. The first time a given auth UID is
 * seen here, a profiles row is auto-created with a generated default
 * username — mirrors the old auto-create behavior, but at the DB
 * level via Supabase instead of Firebase.
 */
export function useIdentity() {
  const [user, setUser] = useState<IdentityUser | null>(null)
  const [identity, setIdentityState] = useState<Identity | null>(null)
  const [loading, setLoading] = useState(true)

  const ensureProfile = useCallback(async (su: SupabaseUser) => {
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', su.id)
      .maybeSingle()

    if (existing) {
      setIdentityState(mapRow(existing))
      return
    }

    let username = generateUsername()
    for (let attempts = 0; attempts < 5; attempts++) {
      const { data, error } = await supabase
        .from('profiles')
        .insert({ id: su.id, username, display_name: username })
        .select()
        .single()

      if (data) {
        setIdentityState(mapRow(data))
        return
      }
      if (error?.code === '23505') {
        username = generateUsername()
        continue
      }
      console.error('Failed to create profile:', error)
      return
    }
  }, [])

  useEffect(() => {
    let active = true

    async function handleSession(su: SupabaseUser | null) {
      if (!active) return
      if (su) {
        setUser({ uid: su.id, id: su.id, email: su.email ?? null, isAnonymous: su.is_anonymous ?? false })
        await ensureProfile(su)
      } else {
        setUser(null)
        setIdentityState(null)
      }
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session?.user ?? null))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session?.user ?? null)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [ensureProfile])

  const updateDisplayName = useCallback(async (newName: string): Promise<ActionResult> => {
    if (!user) return { success: false, error: 'Not signed in.' }
    const trimmed = newName.trim().slice(0, 30)
    if (!trimmed) return { success: false, error: 'Name cannot be empty.' }

    const { error } = await supabase.from('profiles').update({ display_name: trimmed }).eq('id', user.id)
    if (error) return { success: false, error: 'Could not update name.' }

    setIdentityState(prev => (prev ? { ...prev, displayName: trimmed } : prev))
    return { success: true }
  }, [user])

  const changeUsername = useCallback(async (newUsername: string): Promise<ActionResult> => {
    if (!user) return { success: false, error: 'Not signed in.' }
    const cleaned = newUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (cleaned.length < 3) return { success: false, error: 'Username must be at least 3 characters.' }

    const { error } = await supabase.from('profiles').update({ username: cleaned }).eq('id', user.id)
    if (error) {
      if (error.code === '23505') return { success: false, error: 'That username is already taken.' }
      return { success: false, error: 'Could not update username.' }
    }

    setIdentityState(prev => (prev ? { ...prev, username: cleaned } : prev))
    return { success: true }
  }, [user])

  return { user, identity, loading, updateDisplayName, changeUsername }
}