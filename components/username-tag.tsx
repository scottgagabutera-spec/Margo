'use client'
import Link from 'next/link'
import { useAuthorProfile } from '@/hooks/useAuthorProfile'
import { ArtistBadge } from '@/components/artist-badge'

const font = 'var(--font-lora), serif'

interface UsernameTagProps {
  authorUid?: string | null
  fallbackName?: string | null
}

/**
 * Renders a post author's display name plus a pressable @username that
 * links to their profile — resolved LIVE from the profiles table via
 * authorUid (Option B), not the frozen username snapshot stored on the
 * post at write time. Falls back to the snapshot name while resolving,
 * or if no authorUid exists on older posts written before this system.
 *
 * Also renders the shared ArtistBadge inline next to the display name
 * when the resolved profile is a verified artist in good standing —
 * this is the single place that makes the badge appear across every
 * surface that already uses UsernameTag (currently: Feed), instead of
 * each surface needing to remember to add it separately.
 */
export function UsernameTag({ authorUid, fallbackName }: UsernameTagProps) {
  const profile = useAuthorProfile(authorUid)

  const displayName = profile?.displayName || fallbackName || 'Margo Listener'
  const username = profile?.username

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontFamily: font, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>
          {displayName}
        </span>
        {profile && (
          <ArtistBadge isArtist={profile.isArtist} artistStatus={profile.artistStatus} size={13} />
        )}
      </span>
      {username && (
        <Link
          href={`/profile/${username}`}
          style={{
            fontFamily: font, fontSize: '0.7rem', color: 'var(--text-3)',
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
            minHeight: 'var(--margo-touch-min)', padding: '0 6px',
            boxSizing: 'border-box', transition: 'color 150ms ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
        >
          @{username}
        </Link>
      )}
    </span>
  )
}