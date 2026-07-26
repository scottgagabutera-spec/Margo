'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

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

export interface Identity {
  id: string
  username: string        // unique @handle — enforced by Postgres unique constraint
  displayName: string     // free text, shown on posts/profile — not unique
  bio: string | null
  signatureLyric: string | null
  signatureSong: string | null
  signatureArtist: string | null
  isArtist: boolean
  isPrivate: boolean      // GIANTS WAY: open-follow by default; this is the opt-in escape valve
  settings: Record<string, unknown>
  createdAt: string
}

interface ActionResult {
  success: boolean
  error?: string
}

function mapRow(row: any): Identity {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    signatureLyric: row.signature_lyric,
    signatureSong: row.signature_song,
    signatureArtist: row.signature_artist,
    isArtist: row.is_artist,
    isPrivate: row.is_private,
    settings: row.settings || {},
    createdAt: row.created_at,
  }
}

/**
 * Supabase equivalent of hooks/useIdentity.ts. Relies on
 * SupabaseAuthProvider already having created an anonymous session for
 * every visitor. The first time that user id is seen here, a
 * profiles row is auto-created with a generated default username — no
 * button, no banner required. Later, real sign-up (updateUser /
 * linkIdentity) upgrades the same session in place; this hook doesn't
 * need to change for that to work, since it only ever reads/writes
 * profiles by auth.uid().
 *
 * Username collisions are handled by retrying on Postgres's unique
 * constraint violation (error code 23505) rather than Firebase's
 * manual transaction-based reservation — this is the exact
 * simplification the migration doc's Section 2 called out.
 */
export function useSupabaseIdentity() {
  const [user, setUser] = useState<User | null>(null)
  const [identity, setIdentityState] = useState<Identity | null>(null)
  const [loading, setLoading] = useState(true)

  const ensureProfile = useCallback(async (u: User) => {
    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .maybeSingle()

    if (fetchError) {
      console.error('[useSupabaseIdentity] Failed to read profile:', fetchError)
      return
    }

    if (existing) {
      setIdentityState(mapRow(existing))
      return
    }

    // First time seeing this user — generate + insert a default
    // username, retrying a few times in the rare case of collision.
    let username = generateUsername()
    let inserted: any = null
    for (let attempts = 0; attempts < 5 && !inserted; attempts++) {
      const { data, error } = await supabase
        .from('profiles')
        .insert({ id: u.id, username, display_name: username })
        .select()
        .single()

      if (!error) {
        inserted = data
      } else if (error.code === '23505') {
        username = generateUsername() // unique_violation — try another
      } else {
        console.error('[useSupabaseIdentity] Failed to create profile:', error)
        return
      }
    }

    if (inserted) setIdentityState(mapRow(inserted))
  }, [])

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      setUser(session?.user ?? null)
      if (session?.user) {
        ensureProfile(session.user).finally(() => !cancelled && setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      setUser(session?.user ?? null)
      if (session?.user) {
        ensureProfile(session.user)
      } else {
        setIdentityState(null)
      }
    })

    return () => { cancelled = true; subscription.unsubscribe() }
  }, [ensureProfile])

  // Free-text display name — no uniqueness constraint, editable anytime.
  const updateDisplayName = useCallback(async (newName: string): Promise<ActionResult> => {
    if (!user) return { success: false, error: 'Not signed in.' }
    const trimmed = newName.trim().slice(0, 30)
    if (!trimmed) return { success: false, error: 'Name cannot be empty.' }
    const { error } = await supabase.from('profiles').update({ display_name: trimmed }).eq('id', user.id)
    if (error) return { success: false, error: 'Could not update name. Please try again.' }
    setIdentityState(prev => (prev ? { ...prev, displayName: trimmed } : prev))
    return { success: true }
  }, [user])

  // Change the unique @handle — Postgres unique constraint enforces atomically.
  const changeUsername = useCallback(async (newUsername: string): Promise<ActionResult> => {
    if (!user || !identity) return { success: false, error: 'Not signed in.' }
    const cleaned = newUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (cleaned.length < 3) return { success: false, error: 'Username must be at least 3 characters.' }
    if (cleaned === identity.username) return { success: true }

    const { error } = await supabase.from('profiles').update({ username: cleaned }).eq('id', user.id)
    if (error) {
      if (error.code === '23505') return { success: false, error: 'That username is already taken.' }
      return { success: false, error: 'Could not update username. Please try again.' }
    }
    setIdentityState(prev => (prev ? { ...prev, username: cleaned } : prev))
    return { success: true }
  }, [user, identity])

  // The signature lyric — the Margo-specific profile field (UNIQUE FOR
  // MARGO), a pinned lyric-and-source pair shown like a bio would be.
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

  const submitArtistApplication = useCallback(async (
    data: { displayArtistName: string; links: ArtistApplicationLinks; note?: string; rightsAgreed: boolean }
  ): Promise<ActionResult> => {
    if (!user) return { success: false, error: 'Not signed in.' }

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

    const { error } = await supabase.from('artist_applications').insert({
      profile_id: user.id,
      status: 'pending',
      display_artist_name: name,
      links: cleanedLinks,
      note: data.note?.trim() || null,
      rights_agreed: true,
    })

    if (error) return { success: false, error: 'Could not submit application. Please try again.' }
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
    submitArtistApplication,
  }
}