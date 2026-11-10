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

const SOCIAL_KEYS: ArtistLinkKey[] = ['instagram', 'tiktok', 'youtube', 'x']
const PROFILE_STREAMING_KEYS: ArtistLinkKey[] = ['spotify', 'appleMusic']
const LISTEN_KEYS: ArtistLinkKey[] = ['spotify', 'appleMusic', 'soundcloud', 'audiomack', 'boomplay', 'linktree']

export function ProfileArtistLinks({
  links,
  compact = false,
  variant = compact ? 'compact' : 'default',
  margoProfileUsername,
  onMargoProfileClick,
}: {
  links: ArtistApplicationLinks | null | undefined
  /** @deprecated Use variant="compact" */
  compact?: boolean
  variant?: 'default' | 'compact' | 'preview' | 'profile'
  /** When set, appends Margo symbol linking to the artist profile (compact/default only). */
  margoProfileUsername?: string | null
  onMargoProfileClick?: () => void
}) {
  const resolvedVariant = variant === 'default' && compact ? 'compact' : variant

  const items = ARTIST_LINK_FIELDS.flatMap((field) => {
    const href = links?.[field.key]
    if (!href) return []
    return [{ ...field, href }]
  })

  if (resolvedVariant === 'preview') {
    const social = items.filter((i) => SOCIAL_KEYS.includes(i.key))
    const listen = items.filter((i) => LISTEN_KEYS.includes(i.key))

    if (social.length === 0 && listen.length === 0 && !margoProfileUsername) return null

    const textLink: CSSProperties = {
      fontFamily: font,
      fontSize: '0.75rem',
      fontWeight: 400,
      color: 'var(--text-secondary)',
      textDecoration: 'none',
      lineHeight: 1.4,
    }

    const groupLabel: CSSProperties = {
      fontFamily: font,
      fontSize: '0.75rem',
      fontWeight: 400,
      color: 'var(--text-muted)',
      marginRight: '8px',
      flexShrink: 0,
    }

    const renderGroup = (label: string, rowItems: typeof items) => {
      if (rowItems.length === 0) return null
      return (
        <p style={{
          margin: '0 0 6px', lineHeight: 1.5,
          display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0 2px',
        }}>
          <span style={groupLabel}>{label}</span>
          <span>
            {rowItems.map((item, idx) => (
              <span key={item.key}>
                {idx > 0 ? (
                  <span style={{ color: 'var(--text-muted)', margin: '0 5px' }}>·</span>
                ) : null}
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={textLink}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                >
                  {item.label}
                </a>
              </span>
            ))}
          </span>
        </p>
      )
    }

    return (
      <div>
        {renderGroup('Follow', social)}
        {renderGroup('Listen', listen)}
        {margoProfileUsername ? (
          <Link
            href={`/profile/${margoProfileUsername}`}
            onClick={onMargoProfileClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: social.length || listen.length ? '2px' : 0,
              padding: '6px 0',
              minHeight: '32px',
              textDecoration: 'none',
              color: 'var(--text-secondary)',
            }}
          >
            <MargoSymbol size={16} variant="gold" />
            <span style={{
              fontFamily: font, fontSize: '0.75rem', fontWeight: 500,
              color: 'var(--text-secondary)',
            }}>
              Profile on Margo
            </span>
          </Link>
        ) : null}
      </div>
    )
  }

  if (resolvedVariant === 'profile') {
    const social = SOCIAL_KEYS.flatMap((key) => {
      const href = links?.[key]
      if (!href) return []
      const field = ARTIST_LINK_FIELDS.find((f) => f.key === key)
      return field ? [{ ...field, href }] : []
    })
    const streaming = PROFILE_STREAMING_KEYS.flatMap((key) => {
      const href = links?.[key]
      if (!href) return []
      const field = ARTIST_LINK_FIELDS.find((f) => f.key === key)
      return field ? [{ ...field, href }] : []
    })
    if (social.length === 0 && streaming.length === 0) return null
    return (
      <div className="margo-profile-artist-icon-row">
        {social.map((item) => {
          const Icon = ICONS[item.key]
          return (
            <a
              key={item.key}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={item.label}
              className="margo-profile-artist-icon-row__btn"
            >
              <Icon size={16} color="var(--text-secondary)" />
            </a>
          )
        })}
        {social.length > 0 && streaming.length > 0 ? (
          <span className="margo-profile-artist-icon-row__divider" aria-hidden />
        ) : null}
        {streaming.map((item) => {
          const Icon = ICONS[item.key]
          return (
            <a
              key={item.key}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={item.label}
              className="margo-profile-artist-icon-row__btn"
            >
              <Icon size={16} color="var(--text-secondary)" />
            </a>
          )
        })}
      </div>
    )
  }

  if (items.length === 0 && !margoProfileUsername) return null

  const iconSize = resolvedVariant === 'compact' ? 14 : 15
  const btnSize = resolvedVariant === 'compact' ? 32 : 30

  const linkStyle = (size?: number): CSSProperties => ({
    width: size ?? 'var(--margo-touch-min)',
    height: size ?? 'var(--margo-touch-min)',
    minWidth: size ?? 'var(--margo-touch-min)',
    minHeight: size ?? 'var(--margo-touch-min)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    border: '1px solid var(--border-hi)',
    background: 'var(--surface-2)',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    WebkitTapHighlightColor: 'transparent',
    flexShrink: 0,
  })

  return (
    <div style={{ marginBottom: resolvedVariant === 'compact' ? 0 : '24px' }}>
      {resolvedVariant === 'default' ? (
        <p style={{
          fontFamily: font, fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)',
          textTransform: 'none', letterSpacing: '-0.01em', marginBottom: '8px',
        }}>Listen &amp; follow</p>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: resolvedVariant === 'compact' ? '5px' : '8px', alignItems: 'center' }}>
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
              <Icon size={iconSize} color="var(--text-secondary)" />
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
            <MargoSymbol size={resolvedVariant === 'compact' ? 18 : 20} variant="gold" />
          </Link>
        ) : null}
      </div>
    </div>
  )
}
