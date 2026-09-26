'use client'

import type { ComponentType } from 'react'
import {
  FacebookIcon,
  InstagramIcon,
  XIcon,
  type MargoIconProps,
} from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'
import { PROMOTE_PLATFORM_DEFS } from '@/lib/promote/platforms'
import type { PromotePlatform } from '@/lib/promote/types'

const font = UI_FONT

const COMING_SOON_ICONS: Partial<Record<PromotePlatform, ComponentType<MargoIconProps>>> = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  x: XIcon,
}

/** Icons only — platforms not yet open for Auto-Promote connect. */
export function PromoteComingSoonPlatformsRow({ compact = false }: { compact?: boolean }) {
  const upcoming = PROMOTE_PLATFORM_DEFS.filter((p) => !p.live && COMING_SOON_ICONS[p.id])

  if (upcoming.length === 0) return null

  return (
    <div
      style={{
        marginBottom: compact ? 0 : '24px',
        padding: compact ? '10px 12px' : '14px 16px',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        background: 'var(--surface-2)',
      }}
    >
      <p style={{
        fontFamily: font,
        fontSize: '0.58rem',
        fontWeight: 700,
        letterSpacing: '0.6px',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        margin: '0 0 10px',
      }}>
        More platforms
      </p>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        {upcoming.map((p) => {
          const Icon = COMING_SOON_ICONS[p.id]
          if (!Icon) return null
          return (
            <span
              key={p.id}
              title={`${p.label} coming soon`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: 0.55,
              }}
            >
              <Icon size={20} color="var(--text-muted)" />
              <span style={{
                fontFamily: font,
                fontSize: '0.62rem',
                color: 'var(--text-muted)',
              }}>
                {p.label}
              </span>
            </span>
          )
        })}
        <span style={{
          fontFamily: font,
          fontSize: '0.62rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
          marginLeft: 'auto',
        }}>
          Coming soon
        </span>
      </div>
    </div>
  )
}
