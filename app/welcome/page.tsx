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
import { useRouter, useSearchParams } from 'next/navigation'
import { MargoPortraitAvatar } from '@/components/margo-portrait-avatar'
import { AuthViewportKeyboardInset, scrollAuthFieldIntoView } from '@/components/auth-viewport'
import { UsernameFieldShell } from '@/components/username-field-shell'
import { useUsernameAvailability } from '@/hooks/useUsernameAvailability'
import { useIdentity } from '@/hooks/useIdentity'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { LoadingRing } from '@/components/loading-ring'
import { PortraitAvatarCropSheet } from '@/components/portrait-avatar-crop-sheet'
import { uploadProfileCover } from '@/components/cover-upload'
import { completeAuthNavigation } from '@/lib/auth-complete-navigation'
import { DISCOVER_VIBES } from '@/lib/discover-vibes'
import { TYPE, UI_FONT } from '@/lib/fonts'
import {
  clearProfileAvatar,
  clearProfileCover,
  uploadProfileAvatar,
} from '@/lib/profile-avatar-upload'
import { persistProfileSettings, fetchWelcomeProfileSnapshot } from '@/lib/welcome-save'
import {
  mergeOnboardingSettings,
  mergeTasteVibesSettings,
  onboardingFromSettings,
  tasteVibesFromSettings,
} from '@/lib/welcome-profile-settings'
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
import { WelcomeStep4Cards } from '@/app/welcome/welcome-step4-cards'
import {
  resolveWelcomeStep4Role,
  welcomeStep4Cards,
  welcomeStep4Subtitle,
} from '@/lib/welcome-step4-content'
import { welcomeVibesHintMessage } from '@/lib/welcome-vibes-hint'
import { welcomeAdvanceStepOptimistic } from '@/lib/welcome-step-navigation'
import { WelcomeStep3RoleSection } from '@/components/welcome-step3-role'
import type { WelcomeCreatorType } from '@/lib/welcome-role-ui'
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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="margo-welcome-status-line__icon">
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="margo-welcome-status-line__icon">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

type StatusTone = 'success' | 'error' | 'checking' | 'neutral' | 'empty'

function StatusLine({
  tone,
  children,
  testId,
}: {
  tone: StatusTone
  children: React.ReactNode
  testId?: string
}) {
  const toneClass = tone === 'empty'
    ? ''
    : ` margo-welcome-status-line--${tone}`
  return (
    <div
      className={`margo-welcome-status-line${toneClass}`}
      aria-live="polite"
      data-margo-welcome-status={testId ?? (tone === 'empty' ? 'empty' : tone)}
    >
      {tone === 'empty' ? (
        <span style={{ visibility: 'hidden' }}>.</span>
      ) : (
        <>
          {tone === 'checking' ? (
            <span className="margo-welcome-status-line__icon">
              <LoadingRing size={14} strokeWidth={2} state="spinning" />
            </span>
          ) : tone === 'success' ? (
            <CheckIcon />
          ) : tone === 'error' ? (
            <XIcon />
          ) : null}
          <span className="margo-welcome-status-line__text" style={{ fontFamily: ui, fontSize: TYPE.meta }}>
            {children}
          </span>
        </>
      )}
    </div>
  )
}

function SavedFlash({ visible }: { visible: boolean }) {
  return (
    <div
      className={`margo-welcome-saved-flash${visible ? ' margo-welcome-saved-flash--on' : ''}`}
      aria-live="polite"
    >
      <CheckIcon />
      <span>Saved</span>
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="margo-welcome-back-btn" onClick={onClick}>
      <ChevronLeftIcon />
      <span>Back</span>
    </button>
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="margo-welcome-back-btn__icon">
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
  const {
    identity,
    updateDisplayName,
    changeUsername,
    syncAvatarUrl,
    syncCoverUrl,
    refreshIdentity,
  } = useIdentity()
  const nameId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const savedFlashTimer = useRef<number | null>(null)
  const vibeSaveTimer = useRef<number | null>(null)
  const creatorTypeSaveTimer = useRef<number | null>(null)
  const profileSettingsRef = useRef<Record<string, unknown> | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [seeded, setSeeded] = useState(false)
  const [moods, setMoods] = useState<string[]>([])
  const [role, setRole] = useState<WelcomeDraftRole | null>(null)
  const [creatorType, setCreatorType] = useState<WelcomeCreatorType | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [photoTarget, setPhotoTarget] = useState<WelcomePhotoTarget | null>(null)
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
  const [avatarUploadState, setAvatarUploadState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [coverUploadState, setCoverUploadState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [avatarUploadError, setAvatarUploadError] = useState(false)
  const [coverUploadError, setCoverUploadError] = useState(false)
  const [step1Attempted, setStep1Attempted] = useState(false)
  const [step3Attempted, setStep3Attempted] = useState(false)
  const [useDialogLayout, setUseDialogLayout] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [step1SaveError, setStep1SaveError] = useState<string | null>(null)
  const [step1Saving, setStep1Saving] = useState(false)
  const [vibesSaveError, setVibesSaveError] = useState<string | null>(null)
  const [roleSaveError, setRoleSaveError] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)

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

  const flashSaved = useCallback(() => {
    setSavedFlash(true)
    if (savedFlashTimer.current) window.clearTimeout(savedFlashTimer.current)
    savedFlashTimer.current = window.setTimeout(() => setSavedFlash(false), 2400)
  }, [])

  useEffect(() => {
    if (!user?.id || seeded) return
    let cancelled = false
    void (async () => {
      const snap = await fetchWelcomeProfileSnapshot(user.id)
      if (cancelled) return
      profileSettingsRef.current = snap.settings
      const draft = readWelcomeDraft(user.id)
      const savedMoods = tasteVibesFromSettings(snap.settings)
      const onboarding = onboardingFromSettings(snap.settings)
      const savedRole = onboarding.role ?? null
      const savedCreatorType = onboarding.creatorType ?? null

      const profileName = identity?.displayName || ''
      const profileUsername = identity?.username && !isTemporaryMemberUsername(identity.username)
        ? identity.username
        : ''

      setDisplayName(profileName || draft?.displayName || '')
      setUsername(profileUsername || draft?.username || '')
      setMoods(savedMoods.length > 0 ? savedMoods : (draft?.moods ?? []))
      setRole(savedRole ?? draft?.role ?? null)
      setCreatorType(savedCreatorType)
      setAvatarPreview(snap.avatarUrl ?? identity?.avatarUrl ?? null)
      setCoverPreview(snap.coverUrl ?? identity?.coverUrl ?? null)
      if (snap.avatarUrl || identity?.avatarUrl) setAvatarUploadState('done')
      if (snap.coverUrl || identity?.coverUrl) setCoverUploadState('done')
      setSeeded(true)
    })()
    return () => { cancelled = true }
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

  const saveTasteVibes = useCallback(async (nextMoods: string[]) => {
    if (!user?.id) return { ok: false as const }
    const result = await persistProfileSettings(user.id, (current) => {
      const merged = mergeTasteVibesSettings(current, nextMoods)
      profileSettingsRef.current = merged
      return merged
    })
    if (!result.ok) {
      setVibesSaveError('Couldn\u2019t save. Try again.')
      return result
    }
    setVibesSaveError(null)
    flashSaved()
    return result
  }, [user?.id, flashSaved])

  const saveOnboardingRole = useCallback(async (nextRole: WelcomeDraftRole | null) => {
    if (!user?.id) return { ok: false as const }
    const result = await persistProfileSettings(user.id, (current) => {
      const merged = mergeOnboardingSettings(current, { role: nextRole ?? undefined })
      profileSettingsRef.current = merged
      return merged
    })
    if (!result.ok) {
      setRoleSaveError('Couldn\u2019t save. Try again.')
      return result
    }
    setRoleSaveError(null)
    flashSaved()
    return result
  }, [user?.id, flashSaved])

  const saveOnboardingCreatorType = useCallback(async (next: WelcomeCreatorType | null) => {
    if (!user?.id) return { ok: false as const }
    return persistProfileSettings(user.id, (current) => {
      const patch = next === null ? { creatorType: null } : { creatorType: next }
      const merged = mergeOnboardingSettings(current, patch)
      profileSettingsRef.current = merged
      return merged
    })
  }, [user?.id])

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

  const saveStep1Profile = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !step1Valid) return false
    setStep1Saving(true)
    setStep1SaveError(null)
    try {
      const tasks: Promise<{ success: boolean; error?: string }>[] = []
      const nextName = displayValidation.ok ? displayValidation.value : displayName.trim()
      if (nextName && nextName !== identity?.displayName) {
        tasks.push(updateDisplayName(nextName))
      }
      const nextUser = usernameValidation.ok ? usernameValidation.value : usernameClean
      if (nextUser && nextUser !== identity?.username) {
        tasks.push(changeUsername(username))
      }
      if (tasks.length > 0) {
        const results = await Promise.all(tasks)
        const failed = results.find((r) => !r.success)
        if (failed) {
          setStep1SaveError('Couldn\u2019t save. Try again.')
          return false
        }
        await refreshIdentity()
      }
      flashSaved()
      return true
    } finally {
      setStep1Saving(false)
    }
  }, [
    user?.id,
    step1Valid,
    displayValidation,
    displayName,
    identity?.displayName,
    identity?.username,
    usernameValidation,
    usernameClean,
    username,
    updateDisplayName,
    changeUsername,
    refreshIdentity,
    flashSaved,
  ])

  const nameInitial = useMemo(() => {
    const v = displayValidation.ok ? displayValidation.value : displayName.trim()
    const ch = v.charAt(0).toUpperCase()
    return ch || '?'
  }, [displayName, displayValidation])

  const uploadAvatarFile = useCallback(async (file: File) => {
    if (!user?.id) return
    const blobUrl = URL.createObjectURL(file)
    setAvatarPreview(blobUrl)
    setAvatarUploadState('uploading')
    setAvatarUploadError(false)
    try {
      const url = await uploadProfileAvatar(user.id, file)
      syncAvatarUrl(url)
      setAvatarPreview(url)
      setAvatarUploadState('done')
      flashSaved()
    } catch {
      setAvatarUploadState('error')
      setAvatarUploadError(true)
    }
  }, [user?.id, syncAvatarUrl, flashSaved])

  const uploadCoverFile = useCallback(async (file: File) => {
    if (!user?.id) return
    const blobUrl = URL.createObjectURL(file)
    setCoverPreview(blobUrl)
    setCoverUploadState('uploading')
    setCoverUploadError(false)
    try {
      const url = await uploadProfileCover(user.id, file)
      syncCoverUrl(url)
      setCoverPreview(url)
      setCoverUploadState('done')
      flashSaved()
    } catch {
      setCoverUploadState('error')
      setCoverUploadError(true)
    }
  }, [user?.id, syncCoverUrl, flashSaved])

  const removePhoto = useCallback(async (target: WelcomePhotoTarget) => {
    if (!user?.id) return
    try {
      if (target === 'avatar') {
        await clearProfileAvatar(user.id)
        await refreshIdentity()
        setAvatarPreview(null)
        setAvatarUploadState('idle')
        setAvatarUploadError(false)
      } else {
        await clearProfileCover(user.id)
        await refreshIdentity()
        setCoverPreview(null)
        setCoverUploadState('idle')
        setCoverUploadError(false)
      }
      flashSaved()
    } catch {
      if (target === 'avatar') setAvatarUploadError(true)
      else setCoverUploadError(true)
    }
  }, [user?.id, refreshIdentity, flashSaved])

  const openPhotoPicker = (target: WelcomePhotoTarget) => {
    setPhotoTarget(target)
    setPhotoSheetOpen(true)
  }

  const handlePickedFile = useCallback((file: File) => {
    if (!photoTarget) return
    if (photoTarget === 'avatar') {
      setPendingAvatarFile(file)
      setCropOpen(true)
    } else {
      void uploadCoverFile(file)
    }
  }, [photoTarget, uploadCoverFile])

  const handleSignOut = async () => {
    try {
      const { signOutBrowser } = await import('@/lib/supabase/client')
      await signOutBrowser()
    } finally {
      window.location.assign('/signin')
    }
  }

  const tryStep1Next = () => {
    setStep1Attempted(true)
    if (!step1Valid || step1Saving) return
    welcomeAdvanceStepOptimistic(
      () => goStep(2),
      () => saveStep1Profile(),
    )
  }

  const tryStep3Next = () => {
    setStep3Attempted(true)
    if (moods.length >= 3) {
      welcomeAdvanceStepOptimistic(
        () => goStep(4),
        () => saveTasteVibes(moods),
      )
    }
  }

  const skipStep3 = () => {
    welcomeAdvanceStepOptimistic(
      () => goStep(4),
      () => saveTasteVibes(moods),
    )
  }

  const finishWelcome = () => {
    if (finishing) return
    setFinishing(true)
    void (async () => {
      const FINISH_TIMEOUT_MS = 8000
      let navigated = false
      const goFeed = () => {
        if (navigated) return
        navigated = true
        completeAuthNavigation('/feed')
      }

      const persistCompletedAt = async () => {
        if (!user?.id) return { ok: false as const }
        return persistProfileSettings(user.id, (current) => {
          const merged = mergeOnboardingSettings(current, {
            completedAt: new Date().toISOString(),
            role: role ?? undefined,
            creatorType: creatorType ?? undefined,
          })
          profileSettingsRef.current = merged
          return merged
        })
      }

      const timeoutId = window.setTimeout(() => {
        goFeed()
        void persistCompletedAt()
      }, FINISH_TIMEOUT_MS)

      try {
        await saveTasteVibes(moods)
        if (role) await saveOnboardingRole(role)
        const saved = await persistCompletedAt()
        window.clearTimeout(timeoutId)
        if (!saved.ok) void persistCompletedAt()
        goFeed()
      } catch {
        window.clearTimeout(timeoutId)
        goFeed()
        void persistCompletedAt()
      }
    })()
  }

  const toggleMood = (mood: string) => {
    setMoods((prev) => {
      const next = prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
      if (vibeSaveTimer.current) window.clearTimeout(vibeSaveTimer.current)
      vibeSaveTimer.current = window.setTimeout(() => {
        void saveTasteVibes(next)
      }, 450)
      return next
    })
  }

  const pickRole = (value: WelcomeDraftRole) => {
    setRole((prev) => {
      const next = prev === value ? null : value
      void saveOnboardingRole(next)
      if (next !== 'artist') {
        setCreatorType(null)
        void saveOnboardingCreatorType(null)
      }
      return next
    })
  }

  const pickCreatorType = (value: WelcomeCreatorType | null) => {
    setCreatorType(value)
    if (creatorTypeSaveTimer.current) window.clearTimeout(creatorTypeSaveTimer.current)
    creatorTypeSaveTimer.current = window.setTimeout(() => {
      void saveOnboardingCreatorType(value)
    }, 350)
  }

  useEffect(() => () => {
    if (savedFlashTimer.current) window.clearTimeout(savedFlashTimer.current)
    if (vibeSaveTimer.current) window.clearTimeout(vibeSaveTimer.current)
    if (creatorTypeSaveTimer.current) window.clearTimeout(creatorTypeSaveTimer.current)
  }, [])

  const displayHandle = usernameClean ? `@${usernameClean}` : '@username'
  const displayTitle = displayValidation.ok ? displayValidation.value : (displayName.trim() || 'Your name')

  const usernameLiveError = (() => {
    if (usernameAvailability === 'checking') return null
    if (usernameSuccess) return null
    if (!usernameValidation.ok) return usernameValidation.message
    if (usernameAvailability === 'taken') return `@${usernameClean} is taken`
    if (usernameAvailability === 'invalid') return 'Not available'
    if (isTemporaryMemberUsername(usernameClean)) return 'Pick a personal username.'
    return null
  })()

  const step4Role = resolveWelcomeStep4Role(role)
  const step4Cards = welcomeStep4Cards(step4Role)

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
                <div className="margo-welcome-step-title-row">
                  <h1 style={{
                    fontFamily: ui,
                    fontSize: TYPE.pageTitle,
                    color: 'var(--text)',
                    fontWeight: 600,
                    margin: '0 0 8px',
                  }}>
                    Your profile
                  </h1>
                  <SavedFlash visible={savedFlash && step === 1} />
                </div>
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
                      hideInlineStatus={usernameSuccess}
                      showFeedback={
                        usernameAvailability === 'available'
                        || usernameAvailability === 'taken'
                        || usernameAvailability === 'invalid'
                        || !usernameValidation.ok
                      }
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
                              : usernameLiveError
                                ? 'inset 0 0 0 1px var(--destructive)'
                                : 'none',
                          }}
                        />
                      </div>
                    </UsernameFieldShell>
                    {usernameAvailability === 'checking' ? (
                      <StatusLine tone="checking" testId="username-checking">Checking…</StatusLine>
                    ) : usernameSuccess ? (
                      <StatusLine tone="success" testId="username-available">
                        @{usernameClean} is available
                      </StatusLine>
                    ) : usernameLiveError ? (
                      <StatusLine tone="error" testId="username-error">
                        {usernameLiveError}
                      </StatusLine>
                    ) : (
                      <StatusLine tone="empty"> </StatusLine>
                    )}
                    {step1SaveError ? (
                      <button
                        type="button"
                        className="margo-welcome-retry-btn"
                        onClick={() => { void saveStep1Profile() }}
                      >
                        <XIcon />
                        {step1SaveError}
                      </button>
                    ) : null}
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
                <div className="margo-welcome-step-title-row">
                  <h1 style={{
                    fontFamily: ui,
                    fontSize: TYPE.pageTitle,
                    color: 'var(--text)',
                    fontWeight: 600,
                    margin: '0 0 8px',
                  }}>
                    Add your photos
                  </h1>
                  <SavedFlash visible={savedFlash && step === 2} />
                </div>
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
                {coverUploadState === 'uploading' ? (
                  <span className="margo-welcome-upload-badge" aria-hidden>
                    <LoadingRing size={22} strokeWidth={2} state="spinning" />
                  </span>
                ) : null}
                {coverUploadState === 'done' ? (
                  <span className="margo-welcome-upload-badge margo-welcome-upload-badge--ok" aria-hidden>
                    <CheckIcon />
                  </span>
                ) : null}
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
              {coverUploadError ? (
                <button
                  type="button"
                  className="margo-welcome-retry-btn"
                  onClick={() => openPhotoPicker('cover')}
                >
                  <XIcon />
                  {'Couldn\u2019t upload. Try again.'}
                </button>
              ) : null}

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
                  {avatarUploadState === 'uploading' ? (
                    <span className="margo-welcome-avatar-upload-badge" aria-hidden>
                      <LoadingRing size={18} strokeWidth={2} state="spinning" />
                    </span>
                  ) : avatarUploadState === 'done' ? (
                    <span className="margo-welcome-avatar-upload-badge margo-welcome-upload-badge--ok" aria-hidden>
                      <CheckIcon />
                    </span>
                  ) : (
                    <span className="margo-welcome-camera-badge" aria-hidden>
                      <CameraIcon />
                    </span>
                  )}
                </button>
              </div>
              {avatarUploadError ? (
                <button
                  type="button"
                  className="margo-welcome-retry-btn"
                  onClick={() => openPhotoPicker('avatar')}
                >
                  <XIcon />
                  {'Couldn\u2019t upload. Try again.'}
                </button>
              ) : null}

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
                <div className="margo-welcome-step-title-row">
                  <h1 style={{
                    fontFamily: ui,
                    fontSize: TYPE.pageTitle,
                    color: 'var(--text)',
                    fontWeight: 600,
                    margin: '0 0 8px',
                  }}>
                    Pick your vibe
                  </h1>
                  <SavedFlash visible={savedFlash && step === 3} />
                </div>
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

              <div className="margo-welcome-chosen-line">
                {step3Attempted && moods.length < 3 ? (
                  <StatusLine tone="error" testId="vibes-error">Pick at least 3, or skip.</StatusLine>
                ) : moods.length >= 3 ? (
                  <StatusLine tone="success" testId="vibes-success">
                    {welcomeVibesHintMessage(moods.length)}
                  </StatusLine>
                ) : (
                  <StatusLine tone="neutral" testId="vibes-hint">
                    {welcomeVibesHintMessage(moods.length)}
                  </StatusLine>
                )}
              </div>
              {vibesSaveError ? (
                <button type="button" className="margo-welcome-retry-btn" onClick={() => { void saveTasteVibes(moods) }}>
                  <XIcon />
                  {vibesSaveError}
                </button>
              ) : null}

              <WelcomeStep3RoleSection
                role={role}
                creatorType={creatorType}
                onPickRole={pickRole}
                onPickCreatorType={pickCreatorType}
              />
              {roleSaveError ? (
                <button type="button" className="margo-welcome-retry-btn" onClick={() => { void saveOnboardingRole(role) }}>
                  <XIcon />
                  {roleSaveError}
                </button>
              ) : null}
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
                  {'You\u2019re in'}
                </h1>
                <p style={{
                  fontFamily: ui,
                  fontSize: TYPE.secondary,
                  color: 'var(--text-secondary)',
                  margin: 0,
                }}>
                  {welcomeStep4Subtitle(step4Role)}
                </p>
              </header>

              <WelcomeStep4Cards cards={step4Cards} />
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
                disabled={step1Saving}
                onClick={tryStep1Next}
              >
                Next
              </button>
            </div>
          ) : null}

          {step === 2 || step === 3 ? (
            <div className="margo-welcome-footer__row">
              <BackButton onClick={() => goStep((step - 1) as WelcomeStep)} />
              <button
                type="button"
                className="margo-welcome-text-btn"
                style={{ justifySelf: 'center' }}
                onClick={() => {
                  if (step === 2) goStep(3)
                  else skipStep3()
                }}
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
            <div className="margo-welcome-footer__row margo-welcome-footer__row--step4">
              <BackButton onClick={() => goStep(3)} />
              <button
                type="button"
                data-margo-welcome-feed
                className={`margo-welcome-next margo-welcome-next--wide${finishing ? ' margo-welcome-next--busy' : ''}`}
                disabled={finishing}
                onClick={finishWelcome}
              >
                {finishing ? (
                  <>
                    <LoadingRing size={18} strokeWidth={2} state="spinning" color="var(--bg)" />
                    Saving…
                  </>
                ) : (
                  'Go to Feed'
                )}
              </button>
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
        onFile={(file) => handlePickedFile(file)}
        onRemove={() => {
          if (photoTarget) void removePhoto(photoTarget)
        }}
      />
      <PortraitAvatarCropSheet
        open={cropOpen}
        onOpenChange={setCropOpen}
        file={pendingAvatarFile}
        onConfirm={(cropped) => {
          setPendingAvatarFile(null)
          void uploadAvatarFile(cropped)
        }}
      />
    </div>
  )
}
