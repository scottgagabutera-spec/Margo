'use client'

import type { ComponentType, CSSProperties } from 'react'
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  XIcon,
  YouTubeIcon,
  type MargoIconProps,
} from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'
import { promoteDestinationSummary, promotePlatformsForUi } from '@/lib/promote/platforms'
import type { PromotePlatform } from '@/lib/promote/types'
import type { MomentShapeId } from '@/lib/moment/types'

const font = UI_FONT

const sectionLabelStyle: CSSProperties = {
  margin: '0 0 8px',
  fontFamily: font,
  fontSize: '0.55rem',
  fontWeight: 700,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
}

const hintStyle: CSSProperties = {
  margin: '8px 0 0',
  fontFamily: font,
  fontSize: '0.68rem',
  color: 'var(--text-muted)',
  lineHeight: 1.35,
  textAlign: 'left',
}

const PLATFORM_ICONS: Record<PromotePlatform, ComponentType<MargoIconProps>> = {
  youtube: YouTubeIcon,
  tiktok: TikTokIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  x: XIcon,
}

interface OutreachChipProps {
  label: string
  hint?: string
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
  busy?: boolean
  active?: boolean
  ariaLabel: string
}

function OutreachChip({
  label,
  hint,
  icon,
  onClick,
  disabled = false,
  busy = false,
  active = false,
  ariaLabel,
}: OutreachChipProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled || busy}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        minWidth: '72px',
        maxWidth: '84px',
        minHeight: 'var(--margo-touch-min)',
        padding: '8px 10px',
        borderRadius: '12px',
        border: active ? '1px solid var(--gold-border)' : '1px solid var(--border-hi)',
        background: active ? 'var(--gold-faint)' : 'rgba(255,255,255,0.03)',
        color: active ? 'var(--gold)' : 'var(--text-secondary)',
        cursor: disabled || busy ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : busy ? 0.7 : 1,
        WebkitTapHighlightColor: 'transparent',
        flexShrink: 0,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </span>
      <span style={{
        fontFamily: font,
        fontSize: '0.58rem',
        fontWeight: 600,
        letterSpacing: '0.2px',
        lineHeight: 1.2,
        textAlign: 'center',
      }}>
        {busy ? '…' : label}
      </span>
      {hint ? (
        <span style={{
          fontFamily: font,
          fontSize: '0.52rem',
          color: 'var(--text-muted)',
          lineHeight: 1.2,
          textAlign: 'center',
        }}>
          {hint}
        </span>
      ) : null}
    </button>
  )
}

interface PlatformBadgeProps {
  label: string
  Icon: ComponentType<MargoIconProps>
  live: boolean
}

function PlatformBadge({ label, Icon, live }: PlatformBadgeProps) {
  const color = live ? 'var(--gold)' : 'var(--text-muted)'
  return (
    <div
      aria-hidden
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        minWidth: '56px',
        padding: '6px 8px',
        borderRadius: '10px',
        border: live ? '1px solid var(--gold-border)' : '1px solid var(--border)',
        background: live ? 'var(--gold-faint)' : 'rgba(255,255,255,0.02)',
        opacity: live ? 1 : 0.55,
        flexShrink: 0,
      }}
    >
      <Icon size={16} color={color} />
      <span style={{
        fontFamily: font,
        fontSize: '0.5rem',
        fontWeight: 600,
        color,
        lineHeight: 1.2,
        textAlign: 'center',
      }}>
        {label}
      </span>
      {!live && (
        <span style={{
          fontFamily: font,
          fontSize: '0.48rem',
          color: 'var(--text-muted)',
          lineHeight: 1.1,
        }}>
          Soon
        </span>
      )}
    </div>
  )
}

interface MomentOutreachActionsProps {
  showStory: boolean
  storyBusy: boolean
  onAddToStory: () => void
  showPromote: boolean
  promoteBusy: boolean
  promoteRequiresVertical: boolean
  shapeId: MomentShapeId
  onPromote: () => void
}

export function MomentOutreachActions({
  showStory,
  storyBusy,
  onAddToStory,
  showPromote,
  promoteBusy,
  promoteRequiresVertical,
  shapeId,
  onPromote,
}: MomentOutreachActionsProps) {
  if (!showStory && !showPromote) return null

  const scrollerStyle: CSSProperties = {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '2px',
    WebkitOverflowScrolling: 'touch',
  }

  const platformDefs = promotePlatformsForUi(shapeId)
  const destinationSummary = promoteDestinationSummary(shapeId)
  const canPromote = !promoteRequiresVertical

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {showStory && (
        <div>
          <p style={sectionLabelStyle}>In Margo</p>
          <div style={scrollerStyle}>
            <OutreachChip
              label="Story"
              hint="24h"
              ariaLabel="Add to your Story"
              icon={(
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="10" cy="10" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
                </svg>
              )}
              onClick={onAddToStory}
              busy={storyBusy}
              active
            />
          </div>
        </div>
      )}

      {showPromote && (
        <div>
          <p style={sectionLabelStyle}>Promote</p>
          <div style={scrollerStyle} className="margo-promote-platforms">
            <OutreachChip
              label="All platforms"
              ariaLabel="Promote to all connected platforms"
              icon={(
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              onClick={onPromote}
              disabled={!canPromote}
              busy={promoteBusy}
              active={canPromote}
            />
            {platformDefs.map((platform) => {
              const Icon = PLATFORM_ICONS[platform.id]
              return (
                <PlatformBadge
                  key={platform.id}
                  label={platform.label}
                  Icon={Icon}
                  live={platform.live}
                />
              )
            })}
          </div>
          {promoteRequiresVertical ? (
            <p style={hintStyle}>
              Switch to Shorts (9:16) to promote across platforms.
            </p>
          ) : (
            <p style={hintStyle}>{destinationSummary}</p>
          )}
          <style>{`
            .margo-promote-platforms::-webkit-scrollbar { display: none; }
          `}</style>
        </div>
      )}
    </div>
  )
}
