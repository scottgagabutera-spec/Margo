'use client'

import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { MargoPortraitAvatar } from '@/components/margo-portrait-avatar'
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
import {
  readWelcomeDraft,
  writeWelcomeDraft,
  type WelcomeDraftRole,
} from '@/lib/welcome-draft'
import { WelcomePhotoPicker, type WelcomePhotoTarget } from '@/app/welcome/welcome-photo-picker'
import './welcome-layout.css'

const ui = UI_FONT
const MOOD_OPTIONS = DISCOVER_VIBES.filter((v) => v !== 'ALL')

type WelcomeStep = 1 | 2 | 3 | 4

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

function parseStep(raw: string | null): WelcomeStep {
  const n = Number.parseInt(raw || '1', 10)
  if (n === 2) return 2
  if (n === 3) return 3
  if (n === 4) return 4
  return 1
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12l5 5L20 7" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="var(--destructive)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function StatusLine({ tone, children }: { tone: 'success' | 'error' | 'empty'; children: React.ReactNode }) {
  return (
    <div className="margo-welcome-status-line" aria-live="polite">
      {tone === 'empty' ? (
        <span style={{ visibility: 'hidden' }}>.</span>
      ) : (
        <>
          {tone === 'success' ? <CheckIcon /> : <XIcon />}
          <span style={{
            fontFamily: ui,
            fontSize: TYPE.meta,
            color: tone === 'success' ? 'var(--success)' : 'var(--destructive)',
          }}>
            {children}
          </span>
        </>
      )}
    </div>
  )
}

function WelcomeProgress({ step }: { step: WelcomeStep }) {
  return (
    <div className="margo-welcome-progress" role="img" aria-label={`Step ${step} of 4`}>
      {([1, 2, 3, 4] as const).map((n) => {
        if (n === step) {
          return <span key={n} className="margo-welcome-progress__pill" />
        }
        if (n < step) {
          return <span key={n} className="margo-welcome-progress__dot margo-welcome-progress__dot--done" />
        }
        return <span key={n} className="margo-welcome-progress__dot" />
      })}
    </div>
  )
}

function PenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 20h4l10-10-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 19c0-2 1.2-3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 8h3l2-2h6l2 2h3v10H4V8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{ verticalAlign: 'middle', marginRight: '2px' }}>
      <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
  const formRef = useRef<HTMLFormElement>(null)

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [seeded, setSeeded] = useState(false)
  const [moods, setMoods] = useState<string[]>([])
  const [role, setRole] = useState<WelcomeDraftRole | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [photoTarget, setPhotoTarget] = useState<WelcomePhotoTarget | null>(null)
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false)
  const [step1Attempted, setStep1Attempted] = useState(false)
  const [step3Attempted, setStep3Attempted] = useState(false)
  const [useDialogLayout, setUseDialogLayout] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const apply = () => setUseDialogLayout(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      requireAuth({ returnTo: `/welcome?step=${step}` })
    }
  }, [loading, user, requireAuth, step])

  useEffect(() => {
    if (!user?.id || seeded) return
    const draft = readWelcomeDraft(user.id)
    if (draft) {
      setDisplayName(draft.displayName)
      setUsername(draft.username)
      setMoods(draft.moods)
      setRole(draft.role)
      setSeeded(true)
      return
    }
    if (identity) {
      setDisplayName(identity.displayName || '')
      setUsername(
        identity.username && !isTemporaryMemberUsername(identity.username)
          ? identity.username
          : '',
      )
    }
    setSeeded(true)
  }, [user?.id, identity, seeded])

  useEffect(() => {
    if (!user?.id || !seeded) return
    writeWelcomeDraft(user.id, {
      displayName,
      username,
      moods,
      role,
    })
  }, [user?.id, seeded, displayName, username, moods, role])

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

  const usernameClean = usernameValidation.ok
    ? usernameValidation.value
    : normalizeUsernameInput(username)

  const usernameSuccess =
    displayValidation.ok
    && usernameValidation.ok
    && !isTemporaryMemberUsername(usernameClean)
    && usernameAvailability === 'available'
    && username.trim().length > 0

  const step1Valid = usernameSuccess && displayValidation.ok

  const nameInitial = useMemo(() => {
    const v = displayValidation.ok ? displayValidation.value : displayName.trim()
    const ch = v.charAt(0).toUpperCase()
    return ch || '?'
  }, [displayName, displayValidation])

  const setPreviewFile = useCallback((
    kind: WelcomePhotoTarget,
    file: File | null,
  ) => {
    if (kind === 'avatar') {
      setAvatarPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return file ? URL.createObjectURL(file) : null
      })
    } else {
      setCoverPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return file ? URL.createObjectURL(file) : null
      })
    }
  }, [])

  const openPhotoPicker = (target: WelcomePhotoTarget) => {
    setPhotoTarget(target)
    setPhotoSheetOpen(true)
  }

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    window.location.assign('/signin')
  }

  const tryStep1Next = () => {
    setStep1Attempted(true)
    if (step1Valid) goStep(2)
  }

  const tryStep3Next = () => {
    setStep3Attempted(true)
    if (moods.length >= 3) goStep(4)
  }

  const toggleMood = (mood: string) => {
    setMoods((prev) => (
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    ))
  }

  const displayHandle = usernameClean ? `@${usernameClean}` : '@username'
  const displayTitle = displayValidation.ok ? displayValidation.value : (displayName.trim() || 'Your name')

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

  const step1NameError = step1Attempted && !displayValidation.ok
    ? (displayName.trim() ? displayValidation.message : 'Enter your name.')
    : null

  const step1UserError = step1Attempted && !usernameSuccess
    ? (!usernameValidation.ok
      ? usernameValidation.message
      : usernameAvailability === 'taken'
        ? 'Already taken'
        : usernameAvailability === 'invalid'
          ? 'Not available'
          : isTemporaryMemberUsername(usernameClean)
            ? 'Pick a personal username.'
            : 'Not available')
    : null

  return (
    <div className="margo-welcome-shell" data-margo-welcome="ready" data-margo-welcome-step={step}>
      <AuthViewportKeyboardInset />
      <div className="margo-welcome-column">
        <div style={{
          display: 'flex',
          justifyContent: step === 1 ? 'space-between' : 'flex-start',
          alignItems: 'center',
          minHeight: 'var(--margo-touch-min)',
          marginBottom: '4px',
          gap: '12px',
        }}>
          {step === 1 ? (
            <>
              <WelcomeProgress step={step} />
              <button
                type="button"
                onClick={() => { void handleSignOut() }}
                className="margo-welcome-text-btn"
                style={{ color: 'var(--text-muted)', flexShrink: 0 }}
              >
                Sign out
              </button>
            </>
          ) : (
            <WelcomeProgress step={step} />
          )}
        </div>

        <div className="margo-welcome-scroll">
          {step === 1 ? (
            <div data-margo-welcome-panel="profile">
              <header style={{ marginBottom: '20px' }}>
                <h1 style={{
                  fontFamily: ui,
                  fontSize: TYPE.pageTitle,
                  color: 'var(--text)',
                  fontWeight: 600,
                  margin: '0 0 8px',
                }}>
                  Your profile
                </h1>
                <p style={{
                  fontFamily: ui,
                  fontSize: TYPE.secondary,
                  color: 'var(--text-secondary)',
                  margin: 0,
                  lineHeight: 1.45,
                }}>
                  This is how people will find you.
                </p>
              </header>

              <form
                ref={formRef}
                onSubmit={(e) => {
                  e.preventDefault()
                  tryStep1Next()
                }}
              >
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
                      style={{
                        ...fieldStyle,
                        borderColor: step1NameError ? 'var(--destructive)' : 'var(--border)',
                      }}
                    />
                    <StatusLine tone={step1NameError ? 'error' : 'empty'}>
                      {step1NameError || ''}
                    </StatusLine>
                  </div>

                  <div>
                    <label style={labelStyle}>Username</label>
                    <UsernameFieldShell
                      visualState={usernameAvailability}
                      showFeedback={false}
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
                            boxShadow: usernameSuccess
                              ? 'inset 0 0 0 1px var(--success)'
                              : step1UserError
                                ? 'inset 0 0 0 1px var(--destructive)'
                                : 'none',
                          }}
                        />
                      </div>
                    </UsernameFieldShell>
                    {usernameSuccess ? (
                      <StatusLine tone="success">
                        @{usernameClean} is available
                      </StatusLine>
                    ) : (
                      <StatusLine tone={step1UserError ? 'error' : 'empty'}>
                        {step1UserError || ''}
                      </StatusLine>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'center',
                    marginTop: '4px',
                  }}>
                    <div style={{ pointerEvents: 'none', flexShrink: 0 }}>
                      <MargoPortraitAvatar
                        size="profile"
                        imageUrl={avatarPreview}
                        fallbackInitial={nameInitial}
                        separationRingColor="var(--bg)"
                      />
                    </div>
                    <p style={{
                      fontFamily: ui,
                      fontSize: TYPE.meta,
                      color: 'var(--text-muted)',
                      margin: 0,
                      lineHeight: 1.4,
                      minWidth: 0,
                    }}>
                      Your portrait tile. It shows your first letter until you add a photo.
                    </p>
                  </div>
                </div>
              </form>
            </div>
          ) : null}

          {step === 2 ? (
            <div data-margo-welcome-panel="photos">
              <header style={{ marginBottom: '16px' }}>
                <h1 style={{
                  fontFamily: ui,
                  fontSize: TYPE.pageTitle,
                  color: 'var(--text)',
                  fontWeight: 600,
                  margin: '0 0 8px',
                }}>
                  Add your photos
                </h1>
                <p style={{
                  fontFamily: ui,
                  fontSize: TYPE.secondary,
                  color: 'var(--text-secondary)',
                  margin: 0,
                }}>
                  Optional. You can add or change them later.
                </p>
              </header>

              <button
                type="button"
                className="margo-welcome-cover"
                data-margo-welcome-cover
                aria-label={coverPreview ? 'Change cover photo' : 'Add cover photo'}
                onClick={() => openPhotoPicker('cover')}
              >
                {coverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreview} alt="" className="margo-welcome-cover__img" />
                ) : (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    height: '100%',
                    color: 'var(--text-muted)',
                    fontFamily: ui,
                    fontSize: TYPE.secondary,
                  }}>
                    <CameraIcon />
                    Add cover
                  </span>
                )}
              </button>

              <div className="margo-welcome-avatar-stack">
                <button
                  type="button"
                  data-margo-welcome-avatar
                  onClick={() => openPhotoPicker('avatar')}
                  aria-label={avatarPreview ? 'Change profile photo' : 'Add profile photo'}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <MargoPortraitAvatar
                    size="profile"
                    imageUrl={avatarPreview}
                    fallbackInitial={nameInitial}
                    separationRingColor="var(--bg)"
                  />
                  <span className="margo-welcome-camera-badge" aria-hidden>
                    <CameraIcon />
                  </span>
                </button>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <p style={{
                  fontFamily: ui,
                  fontSize: TYPE.body,
                  fontWeight: 600,
                  color: 'var(--text)',
                  margin: '0 0 4px',
                }}>
                  {displayTitle}
                </p>
                <p style={{
                  fontFamily: ui,
                  fontSize: TYPE.meta,
                  color: 'var(--text-muted)',
                  margin: 0,
                }}>
                  {displayHandle}
                </p>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div data-margo-welcome-panel="vibes">
              <header style={{ marginBottom: '16px' }}>
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
                }}>
                  Choose at least 3 moods to shape your feed.
                </p>
              </header>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '12px',
                width: '100%',
                minWidth: 0,
              }}>
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
                        border: selected ? '1px solid var(--gold-border)' : '1px solid transparent',
                        cursor: 'pointer',
                        minHeight: 'var(--margo-touch-min)',
                        background: selected ? 'var(--gold-faint)' : 'var(--surface-2)',
                        color: selected ? 'var(--gold)' : 'var(--text)',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {step3Attempted && moods.length < 3 ? (
                <StatusLine tone="error">Pick at least 3, or skip.</StatusLine>
              ) : (
                <StatusLine tone={moods.length >= 3 ? 'success' : 'empty'}>
                  {moods.length >= 3 ? `${moods.length} chosen` : ''}
                </StatusLine>
              )}

              <p style={{ ...labelStyle, marginTop: '20px', marginBottom: '10px' }}>I&apos;m here as a…</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
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
                        border: selected ? '1px solid var(--gold-border)' : '1px solid transparent',
                        cursor: 'pointer',
                        minHeight: 'var(--margo-touch-min)',
                        background: selected ? 'var(--gold-faint)' : 'var(--surface-2)',
                        color: selected ? 'var(--gold)' : 'var(--text)',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div data-margo-welcome-panel="done">
              <header style={{ marginBottom: '20px' }}>
                <h1 style={{
                  fontFamily: ui,
                  fontSize: TYPE.pageTitle,
                  color: 'var(--text)',
                  fontWeight: 600,
                  margin: '0 0 8px',
                }}>
                  You&apos;re in
                </h1>
                <p style={{
                  fontFamily: ui,
                  fontSize: TYPE.secondary,
                  color: 'var(--text-secondary)',
                  margin: 0,
                }}>
                  Here is what you can do on Margo.
                </p>
              </header>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { icon: <PenIcon />, title: 'Post a lyric', line: 'Say it in a line, your way.' },
                  { icon: <PeopleIcon />, title: 'Follow people', line: 'Your feed fills with voices you like.' },
                  { icon: <ProfileIcon />, title: 'Make it yours', line: 'Add a photo, bio and signature lyric in Edit Profile.' },
                ].map((card) => (
                  <div key={card.title} className="margo-welcome-card">
                    <div className="margo-welcome-card__icon">{card.icon}</div>
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
            </div>
          ) : null}
        </div>

        <footer className="margo-welcome-footer">
          {step === 1 ? (
            <div className="margo-welcome-footer__row margo-welcome-footer__row--step1">
              <span />
              <button
                type="button"
                data-margo-welcome-next
                className="margo-welcome-next"
                onClick={tryStep1Next}
              >
                Next
              </button>
            </div>
          ) : null}

          {step === 2 || step === 3 ? (
            <div className="margo-welcome-footer__row">
              <button
                type="button"
                className="margo-welcome-text-btn"
                onClick={() => goStep((step - 1) as WelcomeStep)}
              >
                <ChevronLeftIcon />
                Back
              </button>
              <button
                type="button"
                className="margo-welcome-text-btn"
                style={{ justifySelf: 'center' }}
                onClick={() => goStep((step + 1) as WelcomeStep)}
              >
                Skip for now
              </button>
              <button
                type="button"
                data-margo-welcome-next
                className="margo-welcome-next"
                onClick={() => {
                  if (step === 2) goStep(3)
                  else tryStep3Next()
                }}
              >
                Next
              </button>
            </div>
          ) : null}

          {step === 4 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <button
                type="button"
                className="margo-welcome-text-btn"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => goStep(3)}
              >
                <ChevronLeftIcon />
                Back
              </button>
              <Link
                href="/feed"
                data-margo-welcome-feed
                className="margo-welcome-next"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  width: '100%',
                  maxWidth: 'none',
                }}
              >
                Go to Feed
              </Link>
            </div>
          ) : null}
        </footer>
      </div>

      <WelcomePhotoPicker
        open={photoSheetOpen}
        onOpenChange={setPhotoSheetOpen}
        target={photoTarget || 'avatar'}
        hasPhoto={photoTarget === 'cover' ? !!coverPreview : !!avatarPreview}
        useDialogLayout={useDialogLayout}
        onFile={(file) => {
          if (photoTarget) setPreviewFile(photoTarget, file)
        }}
        onRemove={() => {
          if (photoTarget) setPreviewFile(photoTarget, null)
        }}
      />
    </div>
  )
}
