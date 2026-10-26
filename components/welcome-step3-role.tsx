'use client'

import { TYPE, UI_FONT } from '@/lib/fonts'
import type { WelcomeDraftRole } from '@/lib/welcome-draft'
import { WELCOME_MUSIC_PROFESSIONALS_MAILTO } from '@/lib/welcome-contact-email'
import {
  WELCOME_CREATOR_TYPE_CHIPS,
  WELCOME_ROLE_OPTIONS,
  type WelcomeCreatorType,
} from '@/lib/welcome-role-ui'

const ui = UI_FONT

const labelStyle = {
  fontFamily: ui,
  fontSize: TYPE.label,
  fontWeight: 600 as const,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: 'var(--text-muted)',
}

type Props = {
  role: WelcomeDraftRole | null
  creatorType: WelcomeCreatorType | null
  onPickRole: (role: WelcomeDraftRole) => void
  onPickCreatorType: (value: WelcomeCreatorType | null) => void
}

export function WelcomeStep3RoleSection({
  role,
  creatorType,
  onPickRole,
  onPickCreatorType,
}: Props) {
  return (
    <>
      <p style={{ ...labelStyle, marginTop: '20px', marginBottom: '10px' }}>{'I\u2019m here as'}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '8px' }}>
        {WELCOME_ROLE_OPTIONS.map((opt) => {
          const selected = role === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              data-margo-welcome-role={opt.value}
              aria-pressed={selected}
              onClick={() => onPickRole(opt.value)}
              style={{
                fontFamily: ui,
                textAlign: 'left',
                padding: '14px 16px',
                borderRadius: '12px',
                border: selected ? '1px solid var(--gold-border)' : '1px solid var(--border)',
                cursor: 'pointer',
                minHeight: 'var(--margo-touch-min)',
                background: selected ? 'var(--gold-faint)' : 'var(--surface-2)',
                color: 'var(--text)',
              }}
            >
              <span style={{ display: 'block', fontSize: TYPE.body, fontWeight: 600, marginBottom: '4px', color: selected ? 'var(--gold)' : 'var(--text)' }}>
                {opt.label}
              </span>
              <span style={{ display: 'block', fontSize: TYPE.meta, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {opt.description}
              </span>
            </button>
          )
        })}
      </div>

      {role === 'artist' ? (
        <div style={{ marginTop: '12px' }} data-margo-welcome-creator-type>
          <p style={{ ...labelStyle, marginBottom: '8px', textTransform: 'none', letterSpacing: '0', fontSize: TYPE.secondary, color: 'var(--text-secondary)' }}>
            What best describes you? <span style={{ fontWeight: 400 }}>(optional)</span>
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {WELCOME_CREATOR_TYPE_CHIPS.map((chip) => {
              const selected = creatorType === chip.value
              return (
                <button
                  key={chip.value}
                  type="button"
                  data-margo-welcome-creator={chip.value}
                  aria-pressed={selected}
                  onClick={() => onPickCreatorType(selected ? null : chip.value)}
                  style={{
                    fontFamily: ui,
                    fontSize: TYPE.meta,
                    fontWeight: 600,
                    padding: '10px 14px',
                    borderRadius: '999px',
                    border: selected ? '1px solid var(--gold-border)' : '1px solid transparent',
                    cursor: 'pointer',
                    minHeight: 'var(--margo-touch-min)',
                    background: selected ? 'var(--gold-faint)' : 'var(--surface-2)',
                    color: selected ? 'var(--gold)' : 'var(--text)',
                  }}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <p style={{ textAlign: 'center', margin: '16px 0 0' }}>
        <a
          href={WELCOME_MUSIC_PROFESSIONALS_MAILTO}
          style={{
            fontFamily: ui,
            fontSize: TYPE.meta,
            color: 'var(--text-muted)',
            textDecoration: 'underline',
          }}
        >
          I work in music
        </a>
      </p>
    </>
  )
}
