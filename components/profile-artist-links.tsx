'use client'

import Link from 'next/link'
import {
  AppleMusicIcon,
  AudiomackIcon,
  BoomplayIcon,
  InstagramIcon,
  LinktreeIcon,
  SoundCloudIcon,
  SpotifyIcon,
  TikTokIcon,
  XIcon,
  YouTubeIcon,
} from '@/components/icons'
import { MargoSymbol } from '@/components/margo-symbol'
import { ARTIST_LINK_FIELDS, type ArtistLinkKey } from '@/lib/artist-links'
import type { ArtistApplicationLinks } from '@/lib/artist-music-group'
import { UI_FONT } from '@/lib/fonts'
import type { CSSProperties } from 'react'
import type { ComponentType } from 'react'
import type { MargoIconProps } from '@/components/icons/icon-props'

const font = UI_FONT

const ICONS: Record<ArtistLinkKey, ComponentType<MargoIconProps>> = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  x: XIcon,
  spotify: SpotifyIcon,
  appleMusic: AppleMusicIcon,
  soundcloud: SoundCloudIcon,
  audiomack: AudiomackIcon,
  boomplay: BoomplayIcon,
  linktree: LinktreeIcon,
}

export function ProfileArtistLinks({
  links,
  compact = false,
  margoProfileUsername,
}: {
  links: ArtistApplicationLinks | null | undefined
  /** Smaller icon row for song preview / compact surfaces. */
  compact?: boolean
  /** When set, appends Margo symbol linking to the artist profile. */
  margoProfileUsername?: string | null
}) {
  const items = ARTIST_LINK_FIELDS.flatMap((field) => {
    const href = links?.[field.key]
    if (!href) return []
    return [{ ...field, href }]
  })

  if (items.length === 0 && !margoProfileUsername) return null

  const iconSize = compact ? 16 : 18
  const btnSize = compact ? 36 : undefined

  const linkStyle = (size?: number): CSSProperties => ({
    width: size ?? 'var(--margo-touch-min)',
    height: size ?? 'var(--margo-touch-min)',
    minWidth: size ?? 'var(--margo-touch-min)',
    minHeight: size ?? 'var(--margo-touch-min)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    border: '1px solid var(--gold-border)',
    background: 'var(--gold-faint)',
    color: 'var(--gold)',
    textDecoration: 'none',
    WebkitTapHighlightColor: 'transparent',
    flexShrink: 0,
  })

  return (
    <div style={{ marginBottom: compact ? 0 : '24px' }}>
      {!compact ? (
        <p style={{
          fontFamily: font, fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px',
        }}>Listen &amp; follow</p>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: compact ? '5px' : '6px' }}>
        {items.map((item) => {
          const Icon = ICONS[item.key]
          return (
            <a
              key={item.key}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={item.label}
              title={item.label}
              style={linkStyle(btnSize)}
            >
              <Icon size={iconSize} color="var(--gold)" />
            </a>
          )
        })}
        {margoProfileUsername ? (
          <Link
            href={`/profile/${margoProfileUsername}`}
            aria-label="Artist on Margo"
            title="Artist on Margo"
            style={linkStyle(btnSize)}
          >
            <MargoSymbol size={compact ? 18 : 20} variant="gold" />
          </Link>
        ) : null}
      </div>
    </div>
  )
}
