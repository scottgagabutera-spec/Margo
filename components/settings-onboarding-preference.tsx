'use client'

import { useCallback, useEffect, useState } from 'react'
import { TYPE, UI_FONT } from '@/lib/fonts'
import { persistProfileSettings } from '@/lib/welcome-save'
import {
  mergeOnboardingSettings,
  onboardingFromSettings,
} from '@/lib/welcome-profile-settings'
import type { WelcomeDraftRole } from '@/lib/welcome-draft'
import {
  WELCOME_LISTENER_ROLE_LABEL,
  WELCOME_ROLE_OPTIONS,
} from '@/lib/welcome-role-ui'

const font = UI_FONT

type Props = {
  userId: string
  settingsJson: Record<string, unknown> | null | undefined
}

export function SettingsOnboardingPreference({ userId, settingsJson }: Props) {
  const saved = onboardingFromSettings(settingsJson).role
  const [role, setRole] = useState<WelcomeDraftRole | null>(saved ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    setRole(saved ?? null)
  }, [saved])

  const pick = useCallback(async (next: 'listener' | 'artist') => {
    setRole(next)
    setSaving(true)
    setError(false)
    const result = await persistProfileSettings(userId, (current) =>
      mergeOnboardingSettings(current, { role: next }),
    )
    setSaving(false)
    if (!result.ok) {
      setError(true)
      setRole(saved ?? null)
    }
  }, [userId, saved])

  return (
    <div data-margo-settings-here-as style={{ marginTop: '16px' }}>
      <p style={{
        fontFamily: font,
        fontSize: TYPE.label,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        margin: '0 0 8px',
      }}>
        I&apos;m here as
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {WELCOME_ROLE_OPTIONS.map((opt) => {
          const selected = role === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selected}
              disabled={saving}
              onClick={() => void pick(opt.value)}
              style={{
                fontFamily: font,
                fontSize: TYPE.meta,
                fontWeight: 600,
                padding: '8px 14px',
                minHeight: 'var(--margo-touch-min)',
                borderRadius: '999px',
                border: selected ? '1px solid var(--gold-border)' : '1px solid var(--border)',
                background: selected ? 'var(--gold-faint)' : 'var(--surface-2)',
                color: selected ? 'var(--gold)' : 'var(--text-secondary)',
                cursor: saving ? 'wait' : 'pointer',
              }}
            >
              {opt.value === 'listener' ? WELCOME_LISTENER_ROLE_LABEL : opt.label}
            </button>
          )
        })}
      </div>
      {error ? (
        <p style={{ fontFamily: font, fontSize: TYPE.meta, color: 'var(--destructive)', margin: '8px 0 0' }}>
          Couldn&apos;t save. Try again.
        </p>
      ) : null}
    </div>
  )
}
