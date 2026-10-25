'use client'

import {
  CompassIcon,
  FeedIcon,
  LyricBackIcon,
  MusicNoteIcon,
  PenLineIcon,
} from '@/components/icons'
import type { WelcomeStep4CardDef, WelcomeStep4IconId } from '@/lib/welcome-step4-content'
import { TYPE, UI_FONT } from '@/lib/fonts'

const ui = UI_FONT

function ProfileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function Step4Icon({ id }: { id: WelcomeStep4IconId }) {
  const color = 'var(--gold)'
  switch (id) {
    case 'pen':
      return <PenLineIcon size={20} color={color} />
    case 'compass':
      return <CompassIcon size={20} color={color} />
    case 'feed':
      return <FeedIcon size={20} color={color} />
    case 'lyric-back':
      return <LyricBackIcon size={20} color={color} />
    case 'apply':
      return <MusicNoteIcon size={20} color={color} />
    case 'profile':
      return <ProfileIcon />
    default:
      return null
  }
}

export function WelcomeStep4Cards({ cards }: { cards: WelcomeStep4CardDef[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {cards.map((card) => (
        <div key={card.id} className="margo-welcome-card" data-margo-welcome-step4-card={card.id}>
          <div className="margo-welcome-card__icon">
            <Step4Icon id={card.icon} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontFamily: ui,
              fontSize: TYPE.body,
              fontWeight: 600,
              color: 'var(--text)',
              margin: '0 0 4px',
            }}>
              {card.title}
            </p>
            <p style={{
              fontFamily: ui,
              fontSize: TYPE.meta,
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: 1.4,
            }}>
              {card.line}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
