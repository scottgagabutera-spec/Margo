'use client'

/**
 * ArtistBadge — verified-artist affordance. Feed uses a minimal inline seal;
 * profile and feed portrait headers use a single uppercase role line below @handle.
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
  /** @deprecated Use presentation="line" on profile instead of label pill. */
  label?: boolean
  /** seal = compact check (legacy inline). line = premium text under @handle. */
  presentation?: 'seal' | 'line'
}

function VerifiedSeal({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Verified Artist"
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

export function ArtistBadge({
  isArtist,
  artistStatus,
  size = 14,
  label = false,
  presentation = 'seal',
}: ArtistBadgeProps) {
  if (!shouldShowArtistBadge(isArtist, artistStatus)) return null

  if (presentation === 'line' || label) {
    return (
      <span className="margo-role-line" data-testid="margo-role-line">
        Artist
      </span>
    )
  }

  return <VerifiedSeal size={size} />
}
