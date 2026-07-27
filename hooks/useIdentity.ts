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
 * seen here, a profiles row is auto-created. If the OAuth provider
 * (Google/Discord) handed back a real name and/or avatar in
 * user_metadata, those are used for display_name/avatar_url — the
 * generated instrument+number handle is reserved for the unique
 * @username only, and is used as a display_name fallback solely for
 * email/password signups where no real name exists yet.
 *
 * Merged 2026-07-27: folded in bio/signature-lyric/privacy actions
 * that previously lived in the parallel (now retired)
 * hooks/useSupabaseIdentity.ts, since this hook is the one actually
 * wired into every component — no call sites need to change. Artist
 * applications deliberately stay out of this hook — that's
 * hooks/useArtistApplication.ts, which also tracks application status
 * (pending/approved/rejected), not just submission.
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

    // Pull whatever real identity data the OAuth provider returned.
    // Google/Discord expose full_name or name, and avatar_url or
    // picture, in user_metadata — email/password signups won't have
    // either, so both fall back sensibly below.
    const meta = su.user_metadata || {}
    const realName: string | null = meta.full_name || meta.name || null
    const avatarUrl: string | null = meta.avatar_url || meta.picture || null

    let username = generateUsername()
    for (let attempts = 0; attempts < 5; attempts++) {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: su.id,
          username,
          display_name: realName || username,
          avatar_url: avatarUrl,
        })
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

  // The signature lyric — the Margo-specific profile field, a pinned
  // lyric-and-source pair shown like a bio would be.
  const updateSignatureLyric = useCallback(async (
    data: { lyric: string; song: string; artist: string }
  ): Promise<ActionResult> => {
    if (!user) return { success: false, error: 'Not signed in.' }
    const { error } = await supabase.from('profiles').update({
      signature_lyric: data.lyric.trim() || null,
      signature_song: data.song.trim() || null,
      signature_artist: data.artist.trim() || null,
    }).eq('id', user.id)
    if (error) return { success: false, error: 'Could not save your signature lyric.' }
    setIdentityState(prev => (prev ? {
      ...prev,
      signatureLyric: data.lyric.trim() || null,
      signatureSong: data.song.trim() || null,
      signatureArtist: data.artist.trim() || null,
    } : prev))
    return { success: true }
  }, [user])

  const updateBio = useCallback(async (newBio: string): Promise<ActionResult> => {
    if (!user) return { success: false, error: 'Not signed in.' }
    const trimmed = newBio.trim().slice(0, 160)
    const { error } = await supabase.from('profiles').update({ bio: trimmed || null }).eq('id', user.id)
    if (error) return { success: false, error: 'Could not update bio.' }
    setIdentityState(prev => (prev ? { ...prev, bio: trimmed || null } : prev))
    return { success: true }
  }, [user])

  const setPrivate = useCallback(async (isPrivate: boolean): Promise<ActionResult> => {
    if (!user) return { success: false, error: 'Not signed in.' }
    const { error } = await supabase.from('profiles').update({ is_private: isPrivate }).eq('id', user.id)
    if (error) return { success: false, error: 'Could not update privacy setting.' }
    setIdentityState(prev => (prev ? { ...prev, isPrivate } : prev))
    return { success: true }
  }, [user])

  return {
    user,
    identity,
    loading,
    updateDisplayName,
    changeUsername,
    updateSignatureLyric,
    updateBio,
    setPrivate,
  }
}