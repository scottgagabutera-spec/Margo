'use client'

import { useEffect, useRef } from 'react'
import type { UsernameAvailabilityState } from '@/hooks/useUsernameAvailability'
import { TYPE, UI_FONT } from '@/lib/fonts'

const ui = UI_FONT

export type UsernameFieldVisualState =
  | 'idle'
  | UsernameAvailabilityState

export function usernameStatusMessage(
  state: UsernameFieldVisualState,
  showFeedback: boolean,
): string {
  if (!showFeedback) return '\u00a0'
  if (state === 'checking') return 'Checking…'
  if (state === 'available') return 'Available'
  if (state === 'taken') return 'Already taken'
  if (state === 'invalid') return 'Not available'
  return '\u00a0'
}

interface UsernameFieldShellProps {
  children: React.ReactNode
  visualState: UsernameFieldVisualState
  showFeedback: boolean
  statusId: string
  'data-margo-username-status'?: string
}

export function UsernameFieldShell({
  children,
  visualState,
  showFeedback,
  statusId,
  'data-margo-username-status': dataStatus,
}: UsernameFieldShellProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const prevInvalid = useRef(false)

  useEffect(() => {
    const invalid = showFeedback && (visualState === 'invalid' || visualState === 'taken')
    if (invalid && !prevInvalid.current && wrapRef.current) {
      wrapRef.current.classList.remove('margo-username-field--shake')
      void wrapRef.current.offsetWidth
      wrapRef.current.classList.add('margo-username-field--shake')
    }
    prevInvalid.current = invalid
  }, [visualState, showFeedback])

  const borderColor =
    showFeedback && visualState === 'available'
      ? 'var(--success)'
      : showFeedback && (visualState === 'invalid' || visualState === 'taken')
        ? 'var(--destructive)'
        : 'var(--border)'

  const tint =
    showFeedback && (visualState === 'invalid' || visualState === 'taken')
      ? 'var(--destructive-faint)'
      : showFeedback && visualState === 'available'
        ? 'var(--success-faint)'
        : 'var(--gold-faint)'

  const statusColor =
    showFeedback && visualState === 'available'
      ? 'var(--success)'
      : showFeedback && (visualState === 'invalid' || visualState === 'taken')
        ? 'var(--destructive)'
        : 'var(--text-muted)'

  return (
    <div ref={wrapRef} className="margo-username-field">
      <div
        style={{
          position: 'relative',
          borderRadius: '12px',
          border: `1px solid ${borderColor}`,
          background: tint,
          transition: 'border-color 150ms ease, background 150ms ease',
        }}
      >
        {children}
      </div>
      <p
        id={statusId}
        data-margo-username-status={dataStatus ?? visualState}
        style={{
          fontFamily: ui,
          fontSize: TYPE.meta,
          color: statusColor,
          margin: '8px 0 0',
          minHeight: '18px',
          lineHeight: 1.35,
        }}
      >
        {usernameStatusMessage(visualState, showFeedback)}
      </p>
    </div>
  )
}
