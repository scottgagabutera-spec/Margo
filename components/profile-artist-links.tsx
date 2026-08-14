'use client'

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
import { ARTIST_LINK_FIELDS, type ArtistLinkKey } from '@/lib/artist-links'
import type { ArtistApplicationLinks } from '@/lib/artist-music-group'
import { collectSameAsUrls } from '@/lib/artist-music-group'
import { UI_FONT } from '@/lib/fonts'
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
}: {
  links: ArtistApplicationLinks | null | undefined
}) {
  const urls = collectSameAsUrls(links)
  if (urls.length === 0) return null

  const items = ARTIST_LINK_FIELDS.flatMap((field) => {
    const href = links?.[field.key]
    if (!href) return []
    return [{ ...field, href }]
  })
  if (items.length === 0) return null

  return (
    <div style={{ marginBottom: '24px' }}>
      <p style={{
        fontFamily: font, fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px',
      }}>Listen &amp; follow</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
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
              style={{
                width: 'var(--margo-touch-min)',
                height: 'var(--margo-touch-min)',
                minWidth: 'var(--margo-touch-min)',
                minHeight: 'var(--margo-touch-min)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                border: '1px solid var(--gold-border)',
                background: 'var(--gold-faint)',
                color: 'var(--gold)',
                textDecoration: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Icon size={18} color="var(--gold)" />
            </a>
          )
        })}
      </div>
    </div>
  )
}
