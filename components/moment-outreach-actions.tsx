'use client'

import type { CSSProperties } from 'react'
import { PromotePlatformPicker } from '@/components/promote/promote-platform-picker'
import { UI_FONT } from '@/lib/fonts'
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

interface MomentOutreachActionsProps {
  showStory: boolean
  storyBusy: boolean
  onAddToStory: () => void
  showPromote: boolean
  promoteBusy: boolean
  postId: string
  shapeId: MomentShapeId
  onPromote: (platforms: PromotePlatform[], confirmRepublish: boolean) => void | Promise<void>
}

export function MomentOutreachActions({
  showStory,
  storyBusy,
  onAddToStory,
  showPromote,
  promoteBusy,
  postId,
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

      {showPromote && postId && (
        <div>
          <p style={sectionLabelStyle}>Promote</p>
          <PromotePlatformPicker
            postId={postId}
            shapeId={shapeId}
            busy={promoteBusy}
            onQueue={onPromote}
          />
        </div>
      )}
    </div>
  )
}
