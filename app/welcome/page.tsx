'use client'

import { Suspense, useCallback, useEffect, useId, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { MargoPortraitAvatar } from '@/components/margo-portrait-avatar'
import { AuthScreenHelp } from '@/components/auth-screen-help'
import { AuthViewportKeyboardInset, scrollAuthFieldIntoView } from '@/components/auth-viewport'
import { UsernameFieldShell } from '@/components/username-field-shell'
import { useUsernameAvailability } from '@/hooks/useUsernameAvailability'
import { useIdentity } from '@/hooks/useIdentity'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { DISCOVER_VIBES } from '@/lib/discover-vibes'
import { TYPE, UI_FONT } from '@/lib/fonts'
import {
  isTemporaryMemberUsername,
  normalizeUsernameInput,
  USERNAME_MAX_LENGTH,
  validateDisplayNameChoice,
  validateUsernameChoice,
} from '@/lib/username-validator'
import './welcome-layout.css'

const ui = UI_FONT
const MOOD_OPTIONS = DISCOVER_VIBES.filter((v) => v !== 'ALL')

type WelcomeStep = 1 | 2 | 3
type AccountRole = 'listener' | 'artist' | 'both'

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: ui,
  fontSize: TYPE.label,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '1.5px',
  marginBottom: '8px',
  fontWeight: 700,
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  height: '44px',
  padding: '0 14px',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  color: 'var(--text)',
  fontFamily: ui,
  fontSize: TYPE.body,
  outline: 'none',
  boxSizing: 'border-box',
}

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  height: '44px',
  padding: '0 14px',
  background: 'var(--gold)',
  color: 'var(--text-on-gold, var(--bg))',
  border: 'none',
  borderRadius: '50px',
  fontFamily: ui,
  fontWeight: 600,
  fontSize: TYPE.meta,
  letterSpacing: '0.2px',
  cursor: 'pointer',
}

function parseStep(raw: string | null): WelcomeStep {
  if (raw === '2') return 2
  if (raw === '3') return 3
  return 1
}

function WelcomeProgressDots({ step }: { step: WelcomeStep }) {
  return (
    <div
      role="img"
      aria-label={`Step ${step} of 3`}
      style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}
    >
      {([1, 2, 3] as const).map((n) => (
        <span
          key={n}
          style={{
            width: n === step ? '8px' : '6px',
            height: n === step ? '8px' : '6px',
            borderRadius: '50%',
            background: n === step ? 'var(--gold)' : 'var(--border)',
            transition: 'background 150ms ease, transform 150ms ease',
          }}
        />
      ))}
    </div>
  )
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: 'var(--bg)' }} />}>
      <WelcomePageInner />
    </Suspense>
  )
}

function WelcomePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const step = parseStep(searchParams.get('step'))
  const { user, loading, requireAuth } = useAuthGate()
  const { identity } = useIdentity()
  const nameId = useId()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [seeded, setSeeded] = useState(false)
  const [moods, setMoods] = useState<string[]>([])
  const [role, setRole] = useState<AccountRole | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      requireAuth({ returnTo: `/welcome?step=${step}` })
    }
  }, [loading, user, requireAuth, step])

  useEffect(() => {
    if (!identity || seeded) return
    setDisplayName(identity.displayName || '')
    setUsername(
      identity.username && !isTemporaryMemberUsername(identity.username)
        ? identity.username
        : '',
    )
    setSeeded(true)
  }, [identity, seeded])

  const goStep = useCallback((next: WelcomeStep) => {
    router.replace(`/welcome?step=${next}`)
  }, [router])

  const usernameAvailability = useUsernameAvailability(
    username,
    identity?.username ?? null,
    user?.id ?? null,
  )

  const displayValidation = useMemo(
    () => validateDisplayNameChoice(displayName),
    [displayName],
  )

  const usernameValidation = useMemo(
    () => validateUsernameChoice(username, identity?.username ?? null),
    [username, identity?.username],
  )

  const step1Ready =
    displayValidation.ok
    && usernameValidation.ok
    && !isTemporaryMemberUsername(
      usernameValidation.ok ? usernameValidation.value : normalizeUsernameInput(username),
    )
    && usernameAvailability === 'available'

  const step2Ready = moods.length >= 3

  const nameInitial = useMemo(() => {
    const v = displayValidation.ok ? displayValidation.value : displayName.trim()
    const ch = v.charAt(0).toUpperCase()
    return ch || '?'
  }, [displayName, displayValidation])

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    window.location.assign('/signin')
  }

  const toggleMood = (mood: string) => {
    setMoods((prev) => (
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    ))
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)' }} data-margo-welcome="loading" />
    )
  }

  if (!user) {
    return (
      <div
        style={{ minHeight: '100dvh', background: 'var(--bg)' }}
        data-margo-welcome="signed-out"
        data-margo-welcome-state="signed-out"
      />
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <AuthViewportKeyboardInset />
      <div
        className="margo-welcome-layout"
        data-margo-welcome="ready"
        data-margo-welcome-step={step}
      >
        <main className="margo-welcome-layout__main">
          <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: 'var(--margo-touch-min)', marginBottom: '4px' }}>
            <button
              type="button"
              onClick={() => { void handleSignOut() }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontFamily: ui,
                fontSize: TYPE.meta,
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: 'var(--margo-touch-min)',
                padding: '0 8px',
              }}
            >
              Sign out
            </button>
          </div>

          <WelcomeProgressDots step={step} />

          {step === 1 ? (
            <div data-margo-welcome-panel="identity">
              <header style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h1 style={{
                  fontFamily: ui,
                  fontSize: TYPE.pageTitle,
                  color: 'var(--text)',
                  fontWeight: 600,
                  margin: '0 0 16px',
                }}>
                  Set up your profile
                </h1>
                <div style={{ display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                  <MargoPortraitAvatar
                    size="profile"
                    fallbackInitial={nameInitial}
                    separationRingColor="var(--bg)"
                  />
                </div>
              </header>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label htmlFor={nameId} style={labelStyle}>Name</label>
                  <input
                    id={nameId}
                    type="text"
                    autoComplete="name"
                    value={displayName}
                    maxLength={30}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onFocus={(e) => scrollAuthFieldIntoView(e.currentTarget)}
                    className="margo-auth-input"
                    style={fieldStyle}
                  />
                  {!displayValidation.ok && displayName.trim() ? (
                    <p role="alert" style={{ fontFamily: ui, fontSize: TYPE.meta, color: 'var(--destructive)', margin: '6px 0 0' }}>
                      {displayValidation.message}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label style={labelStyle}>Username</label>
                  <UsernameFieldShell
                    visualState={usernameAvailability}
                    showFeedback={username.trim().length > 0}
                    statusId="welcome-username-status"
                    data-margo-username-status={usernameAvailability}
                  >
                    <div style={{ position: 'relative' }}>
                      <span style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontFamily: ui,
                        color: 'var(--text-secondary)',
                        fontSize: TYPE.body,
                        zIndex: 1,
                      }}>
                        @
                      </span>
                      <input
                        type="text"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(normalizeUsernameInput(e.target.value))}
                        onFocus={(e) => scrollAuthFieldIntoView(e.currentTarget)}
                        maxLength={USERNAME_MAX_LENGTH}
                        aria-describedby="welcome-username-status"
                        className="margo-auth-input"
                        style={{
                          ...fieldStyle,
                          paddingLeft: '30px',
                          border: 'none',
                          background: 'transparent',
                        }}
                      />
                    </div>
                  </UsernameFieldShell>
                  {!usernameValidation.ok && username.trim() ? (
                    <p role="alert" style={{ fontFamily: ui, fontSize: TYPE.meta, color: 'var(--destructive)', margin: '6px 0 0' }}>
                      {usernameValidation.message}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  data-margo-welcome-continue
                  disabled={!step1Ready}
                  aria-disabled={!step1Ready}
                  onClick={() => goStep(2)}
                  style={{
                    ...primaryBtnStyle,
                    marginTop: '4px',
                    opacity: step1Ready ? 1 : 0.55,
                    cursor: step1Ready ? 'pointer' : 'not-allowed',
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div data-margo-welcome-panel="taste">
              <header style={{ textAlign: 'center', marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={() => goStep(1)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--gold)',
                    fontFamily: ui,
                    fontSize: TYPE.meta,
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginBottom: '12px',
                    minHeight: 'var(--margo-touch-min)',
                    padding: 0,
                  }}
                >
                  Back
                </button>
                <h1 style={{
                  fontFamily: ui,
                  fontSize: TYPE.pageTitle,
                  color: 'var(--text)',
                  fontWeight: 600,
                  margin: '0 0 8px',
                }}>
                  Pick your vibe
                </h1>
                <p style={{
                  fontFamily: ui,
                  fontSize: TYPE.secondary,
                  color: 'var(--text-secondary)',
                  margin: 0,
                  lineHeight: 1.45,
                }}>
                  Choose 3 or more.
                </p>
              </header>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '20px',
                  width: '100%',
                  minWidth: 0,
                }}
              >
                {MOOD_OPTIONS.map((mood) => {
                  const selected = moods.includes(mood)
                  const label = mood.charAt(0) + mood.slice(1).toLowerCase()
                  return (
                    <button
                      key={mood}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleMood(mood)}
                      style={{
                        fontFamily: ui,
                        fontSize: TYPE.meta,
                        fontWeight: 600,
                        padding: '10px 14px',
                        borderRadius: '999px',
                        border: 'none',
                        cursor: 'pointer',
                        minHeight: 'var(--margo-touch-min)',
                        background: selected ? 'var(--gold)' : 'var(--surface-2)',
                        color: selected ? 'var(--text-on-gold, var(--bg))' : 'var(--text)',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              <p style={{ ...labelStyle, marginBottom: '10px' }}>I&apos;m here as a…</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                {([
                  ['listener', 'Listener'],
                  ['artist', 'Artist'],
                  ['both', 'Both'],
                ] as const).map(([value, label]) => {
                  const selected = role === value
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setRole(selected ? null : value)}
                      style={{
                        fontFamily: ui,
                        fontSize: TYPE.meta,
                        fontWeight: 600,
                        padding: '10px 16px',
                        borderRadius: '999px',
                        border: 'none',
                        cursor: 'pointer',
                        minHeight: 'var(--margo-touch-min)',
                        background: selected ? 'var(--gold-faint)' : 'var(--surface-2)',
                        color: 'var(--text)',
                        outline: selected ? '1px solid var(--gold-border)' : 'none',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                data-margo-welcome-continue
                disabled={!step2Ready}
                aria-disabled={!step2Ready}
                onClick={() => goStep(3)}
                style={{
                  ...primaryBtnStyle,
                  opacity: step2Ready ? 1 : 0.55,
                  cursor: step2Ready ? 'pointer' : 'not-allowed',
                }}
              >
                Continue
              </button>

              <p style={{ textAlign: 'center', marginTop: '18px', fontFamily: ui, fontSize: TYPE.secondary }}>
                <button
                  type="button"
                  onClick={() => goStep(3)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--gold)',
                    fontFamily: ui,
                    fontSize: TYPE.meta,
                    fontWeight: 600,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                    minHeight: 'var(--margo-touch-min)',
                  }}
                >
                  Skip for now
                </button>
              </p>
            </div>
          ) : null}

          {step === 3 ? (
            <div data-margo-welcome-panel="done">
              <header style={{ textAlign: 'center', marginBottom: '24px' }}>
                <button
                  type="button"
                  onClick={() => goStep(2)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--gold)',
                    fontFamily: ui,
                    fontSize: TYPE.meta,
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginBottom: '12px',
                    minHeight: 'var(--margo-touch-min)',
                    padding: 0,
                  }}
                >
                  Back
                </button>
                <h1 style={{
                  fontFamily: ui,
                  fontSize: TYPE.pageTitle,
                  color: 'var(--text)',
                  fontWeight: 600,
                  margin: 0,
                }}>
                  Welcome to Margo
                </h1>
              </header>

              <ul style={{
                fontFamily: ui,
                fontSize: TYPE.secondary,
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                paddingLeft: '18px',
                margin: '0 0 24px',
              }}>
                <li style={{ marginBottom: '10px' }}>Post a lyric from Compose.</li>
                <li style={{ marginBottom: '10px' }}>Follow people you like on Feed.</li>
                <li>Add a photo, bio, or signature lyric anytime in Edit Profile.</li>
              </ul>

              <Link
                href="/feed"
                data-margo-welcome-feed
                style={{
                  ...primaryBtnStyle,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                }}
              >
                Go to Feed
              </Link>
            </div>
          ) : null}

          <AuthScreenHelp />
        </main>
      </div>
    </div>
  )
}
