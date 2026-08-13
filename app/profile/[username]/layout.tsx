/**
 * Profile layout — MusicGroup JSON-LD for verified public artists with ≥1 major DSP.
 * Platform schema stays in app/layout.tsx (no sitewide MusicGroup).
 */
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  buildArtistMusicGroupJsonLd,
  type ArtistApplicationLinks,
  type ArtistStatus,
} from '@/lib/artist-music-group'

export default async function ProfileUsernameLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ username: string }>
}) {
  const { username: rawUsername } = await params
  const username = (rawUsername || '').trim()
  const jsonLd = username ? await loadMusicGroupForUsername(username) : null

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      {children}
    </>
  )
}

async function loadMusicGroupForUsername(username: string) {
  try {
    // Prefer cookie client for public profile fields; fall back to admin if
    // env is available (needed for application links under RLS).
    const supabase = await createServerSupabase()
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_artist, artist_status, is_private')
      .eq('username', username)
      .maybeSingle()

    if (profileErr || !profile) return null

    let links: ArtistApplicationLinks | null = null
    let applicationDisplayName: string | null = null

    try {
      const admin = getSupabaseAdmin()
      const { data: application } = await admin
        .from('artist_applications')
        .select('display_artist_name, links, verified_at, created_at')
        .eq('profile_id', profile.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (application) {
        applicationDisplayName = application.display_artist_name ?? null
        links = (application.links || null) as ArtistApplicationLinks | null
      }
    } catch {
      // Missing service role in some local/preview envs — skip schema rather
      // than throw and break the profile page.
      return null
    }

    return buildArtistMusicGroupJsonLd({
      username: profile.username || username,
      displayName: profile.display_name ?? null,
      avatarUrl: profile.avatar_url ?? null,
      isArtist: !!profile.is_artist,
      artistStatus: (profile.artist_status as ArtistStatus) ?? null,
      isPrivate: !!profile.is_private,
      applicationDisplayName,
      links,
    })
  } catch {
    return null
  }
}
