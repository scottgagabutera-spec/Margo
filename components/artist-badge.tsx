'use client'

/**
 * ArtistBadge — the single source of truth for what a verified Margo
 * artist looks like, wherever their identity renders: Feed posts (via
 * UsernameTag), the profile page, the Artists directory, lyric-back
 * attribution, anywhere else a name shows up.
 *
 * Visibility rule: a badge is a public claim of good standing, so it
 * only renders for artist_status 'active' or 'warned' — a private
 * warning between Margo and the artist isn't something the public
 * needs to see reflected in their badge. 'frozen' and 'removed' hide
 * the badge entirely, since displaying it would misrepresent a
 * suspended artist as being in full standing. Rows with no status set
 * yet (legacy / pre-moderation-system) default to visible.
 */

export type ArtistStatus = 'active' | 'warned' | 'frozen' | 'removed' | null | undefined

export function shouldShowArtistBadge(isArtist: boolean, artistStatus?: ArtistStatus): boolean {
  if (!isArtist) return false
  if (!artistStatus) return true
  return artistStatus === 'active' || artistStatus === 'warned'
}

interface ArtistBadgeProps {
  isArtist: boolean
  artistStatus?: ArtistStatus
  size?: number
  // When true, renders the full labeled pill ("Margo Artist") used on
  // the profile page. When false (default), renders just the compact
  // seal icon — meant to sit inline next to a name in tight spaces
  // like Feed cards, the Artists grid, or lyric-back attribution.
  label?: boolean
}

function VerifiedSeal({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Verified Margo Artist"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M12 2l2.39 1.94 3.06-.4.99 2.9 2.9.99-.4 3.06L23 12l-1.94 2.39.4 3.06-2.9.99-.99 2.9-3.06-.4L12 23l-2.39-1.94-3.06.4-.99-2.9-2.9-.99.4-3.06L1 12l1.94-2.39-.4-3.06 2.9-.99.99-2.9 3.06.4L12 2z"
        fill="var(--gold)"
      />
      <path
        d="M8.3 12.4l2.4 2.4 5-5"
        stroke="var(--bg)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ArtistBadge({ isArtist, artistStatus, size = 14, label = false }: ArtistBadgeProps) {
  if (!shouldShowArtistBadge(isArtist, artistStatus)) return null

  if (!label) {
    return <VerifiedSeal size={size} />
  }

  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', fontWeight: 700,
        letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 10px 4px 8px',
        borderRadius: '50px', background: 'rgba(232,197,71,0.12)',
        border: '1px solid var(--gold-border)', color: 'var(--gold)',
      }}
    >
      <VerifiedSeal size={size} />
      Margo Artist
    </span>
  )
}