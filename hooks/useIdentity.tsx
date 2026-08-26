'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { touchLastSeen } from '@/lib/engagement/last-seen'
import { sanitizeArtistLinks } from '@/lib/artist-links'
import { mergeLegalConsentIntoSettings } from '@/lib/legal/consent'
import type { ArtistApplicationLinks } from '@/lib/artist-music-group'

const supabase = createClient()

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

export type ArtistStatus = 'active' | 'warned' | 'frozen' | 'removed' | null

export interface Identity {
  username: string
  displayName: string
  isArtist: boolean
  // Moderation state for approved artists — null for non-artists or
  // legacy rows predating the moderation system (treated as active).
  // Studio access and the public ArtistBadge both key off this.
  artistStatus: ArtistStatus
  isPrivate: boolean
  bio: string | null
  avatarUrl: string | null
  signatureLyric: string | null
  signatureSong: string | null
  signatureArtist: string | null
  artistLinks: ArtistApplicationLinks
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
    artistStatus: row.artist_status ?? null,
    isPrivate: row.is_private,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    signatureLyric: row.signature_lyric,
    signatureSong: row.signature_song,
    signatureArtist: row.signature_artist,
    artistLinks: sanitizeArtistLinks(row.artist_links),
    createdAt: row.created_at,
  }
}

interface IdentityContextValue {
  user: IdentityUser | null
  identity: Identity | null
  loading: boolean
  updateDisplayName: (newName: string) => Promise<ActionResult>
  changeUsername: (newUsername: string) => Promise<ActionResult>
  updateSignatureLyric: (data: { lyric: string; song: string; artist: string }) => Promise<ActionResult>
  updateBio: (newBio: string) => Promise<ActionResult>
  updateArtistLinks: (links: Record<string, string>) => Promise<ActionResult>
  setPrivate: (isPrivate: boolean) => Promise<ActionResult>
  syncAvatarUrl: (url: string) => void
  refreshIdentity: () => Promise<void>
}

const IdentityContext = createContext<IdentityContextValue | null>(null)

/**
 * Supabase-backed identity system. Reads/writes the `profiles` table.
 *
 * Mount once at the root (app/layout.tsx), inside SupabaseAuthProvider.
 * This used to run its own independent supabase.auth.getSession() +
 * onAuthStateChange() listener, separate from SupabaseAuthProvider's —
 * meaning every component that called useIdentity() (MargoNav,
 * MobileTabBar, useUnreadMessagesCount, useArtistApplication,
 * useConversations, useThread, etc.) got its OWN independent instance
 * of this hook, each resolving `user` on its own unsynchronized
 * timing. That skew between independent auth listeners was the root
 * cause of intermittent Realtime channel collisions ("cannot add
 * postgres_changes callbacks after subscribe()") across the app —
 * fixing individual hooks to depend on a stable `userId` primitive
 * wasn't enough, since each hook's own copy of `userId` could still
 * become available at a different moment than another's.
 *
 * Now this reads its raw session from useAuthGate() (SupabaseAuthProvider)
 * instead of tracking auth state itself, so there's exactly one auth
 * listener for the whole app, and every consumer of useIdentity() sees
 * the exact same `user` value at the exact same time.
 *
 * The first time a given auth UID is seen here, a profiles row is
 * auto-created. If the OAuth provider (Google/Discord) handed back a
 * real name and/or avatar in user_metadata, those are used for
 * display_name/avatar_url — the generated instrument+number handle is
 * reserved for the unique @username only, and is used as a
 * display_name fallback solely for email/password signups where no
 * real name exists yet.
 *
 * `identity` state only updates in two places: when the auth user
 * changes (via the effect below), or when refreshIdentity() is called
 * explicitly. Anything that changes profiles columns on the server
 * without going through one of the update/set functions exposed here
 * (for example, a DB trigger flipping is_artist to true after an
 * instant-approve artist application, or an admin action flipping
 * artist_status) will NOT be reflected in `identity` until
 * refreshIdentity() is called. Callers that trigger such a server-side
 * change must call refreshIdentity() themselves afterward. It no-ops
 * if there is no signed-in user.
 */
export function IdentityProvider({ children }: { children: ReactNode }) {
  const { user: supabaseUser, loading: authLoading } = useAuthGate()
  const [identityUser, setIdentityUser] = useState<IdentityUser | null>(null)
  const [identity, setIdentityState] = useState<Identity | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

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

    const meta = su.user_metadata || {}
    const realName: string | null = meta.full_name || meta.name || null
    const avatarUrl: string | null = meta.avatar_url || meta.picture || null
    const settings = mergeLegalConsentIntoSettings(
      meta.terms_accepted_at
        ? {
            legal: {
              termsAcceptedAt: meta.terms_accepted_at,
              termsVersion: meta.terms_version || null,
            },
          }
        : null,
    )

    let username = generateUsername()
    for (let attempts = 0; attempts < 5; attempts++) {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: su.id,
          username,
          display_name: realName || username,
          avatar_url: avatarUrl,
          settings,
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
    if (authLoading) return

    let active = true

    async function sync() {
      if (supabaseUser) {
        setIdentityUser({
          uid: supabaseUser!.id,
          id: supabaseUser!.id,
          email: supabaseUser!.email ?? null,
          isAnonymous: supabaseUser!.is_anonymous ?? false,
        })
        await ensureProfile(supabaseUser!)
      } else {
        setIdentityUser(null)
        setIdentityState(null)
      }
      if (active) setProfileLoading(false)
    }

    sync()

    return () => {
      active = false
    }
  }, [supabaseUser, authLoading, ensureProfile])

  // Heartbeat last_seen_at after profile is ensured; also on focus / visible.
  useEffect(() => {
    if (profileLoading || !identityUser || !identity) return

    const userId = identityUser.id
    void touchLastSeen(userId)

    const onFocus = () => { void touchLastSeen(userId) }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void touchLastSeen(userId)
      }
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [identityUser, identity, profileLoading])

  const updateDisplayName = useCallback(async (newName: string): Promise<ActionResult> => {
    if (!identityUser) return { success: false, error: 'Not signed in.' }
    const trimmed = newName.trim().slice(0, 30)
    if (!trimmed) return { success: false, error: 'Name cannot be empty.' }

    const { error } = await supabase.from('profiles').update({ display_name: trimmed }).eq('id', identityUser.id)
    if (error) return { success: false, error: 'Could not update name.' }

    setIdentityState(prev => (prev ? { ...prev, displayName: trimmed } : prev))
    return { success: true }
  }, [identityUser])

  const changeUsername = useCallback(async (newUsername: string): Promise<ActionResult> => {
    if (!identityUser) return { success: false, error: 'Not signed in.' }
    const cleaned = newUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (cleaned.length < 3) return { success: false, error: 'Username must be at least 3 characters.' }

    const { error } = await supabase.from('profiles').update({ username: cleaned }).eq('id', identityUser.id)
    if (error) {
      if (error.code === '23505') return { success: false, error: 'That username is already taken.' }
      return { success: false, error: 'Could not update username.' }
    }

    setIdentityState(prev => (prev ? { ...prev, username: cleaned } : prev))
    return { success: true }
  }, [identityUser])

  const updateSignatureLyric = useCallback(async (
    data: { lyric: string; song: string; artist: string }
  ): Promise<ActionResult> => {
    if (!identityUser) return { success: false, error: 'Not signed in.' }
    const { error } = await supabase.from('profiles').update({
      signature_lyric: data.lyric.trim() || null,
      signature_song: data.song.trim() || null,
      signature_artist: data.artist.trim() || null,
    }).eq('id', identityUser.id)
    if (error) return { success: false, error: 'Could not save your signature lyric.' }
    setIdentityState(prev => (prev ? {
      ...prev,
      signatureLyric: data.lyric.trim() || null,
      signatureSong: data.song.trim() || null,
      signatureArtist: data.artist.trim() || null,
    } : prev))
    return { success: true }
  }, [identityUser])

  const updateBio = useCallback(async (newBio: string): Promise<ActionResult> => {
    if (!identityUser) return { success: false, error: 'Not signed in.' }
    const trimmed = newBio.trim().slice(0, 160)
    const { error } = await supabase.from('profiles').update({ bio: trimmed || null }).eq('id', identityUser.id)
    if (error) return { success: false, error: 'Could not update bio.' }
    setIdentityState(prev => (prev ? { ...prev, bio: trimmed || null } : prev))
    return { success: true }
  }, [identityUser])

  const updateArtistLinks = useCallback(async (links: Record<string, string>): Promise<ActionResult> => {
    if (!identityUser) return { success: false, error: 'Not signed in.' }
    const cleaned = sanitizeArtistLinks(links)
    const { error } = await supabase.from('profiles').update({ artist_links: cleaned }).eq('id', identityUser.id)
    if (error) return { success: false, error: 'Could not save your links.' }
    setIdentityState(prev => (prev ? { ...prev, artistLinks: cleaned } : prev))
    return { success: true }
  }, [identityUser])

  const setPrivate = useCallback(async (isPrivate: boolean): Promise<ActionResult> => {
    if (!identityUser) return { success: false, error: 'Not signed in.' }
    const { error } = await supabase.from('profiles').update({ is_private: isPrivate }).eq('id', identityUser.id)
    if (error) return { success: false, error: 'Could not update privacy setting.' }
    setIdentityState(prev => (prev ? { ...prev, isPrivate } : prev))
    return { success: true }
  }, [identityUser])

  const syncAvatarUrl = useCallback((url: string) => {
    setIdentityState(prev => (prev ? { ...prev, avatarUrl: url } : prev))
  }, [])

  /**
   * Re-fetches the profiles row for the current user and replaces
   * identity state with it. Use this whenever something changed a
   * profiles column on the server without going through one of the
   * update or set functions above — for example, a DB trigger
   * flipping is_artist to true after an instant-approve artist
   * application, or an admin moderation action changing artist_status.
   * No-ops if there is no signed-in user.
   */
  const refreshIdentity = useCallback(async () => {
    if (!identityUser) return
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', identityUser.id)
      .maybeSingle()
    if (error) {
      console.error('Failed to refresh identity:', error)
      return
    }
    if (data) setIdentityState(mapRow(data))
  }, [identityUser])

  return (
    <IdentityContext.Provider
      value={{
        user: identityUser,
        identity,
        loading: authLoading || profileLoading,
        updateDisplayName,
        changeUsername,
        updateSignatureLyric,
        updateBio,
        updateArtistLinks,
        setPrivate,
        syncAvatarUrl,
        refreshIdentity,
      }}
    >
      {children}
    </IdentityContext.Provider>
  )
}

/**
 * Reads from the shared IdentityProvider. Throws if used outside it —
 * intentional, so a future component can't accidentally spin up its
 * own independent auth listener again.
 */
export function useIdentity() {
  const ctx = useContext(IdentityContext)
  if (!ctx) {
    throw new Error('useIdentity must be used within IdentityProvider')
  }
  return ctx
}