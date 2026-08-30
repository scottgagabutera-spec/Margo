'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient, signOutBrowser } from '@/lib/supabase/client'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { BackButton } from '@/components/back-button'
import { UI_FONT } from '@/lib/fonts'

const supabase = createClient()

const font = UI_FONT

type WhoCanMessage = 'everyone' | 'followers' | 'no_one'

interface NotificationPrefs {
  newFollower: boolean
  newMessage: boolean
  lyricBack: boolean
  resonate: boolean
  emailDigest: boolean
}

const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  newFollower: true,
  newMessage: true,
  lyricBack: true,
  resonate: true,
  emailDigest: false,
}

interface ProfileRow {
  id: string
  username: string
  is_artist: boolean
  is_private: boolean
  who_can_message: WhoCanMessage
  deactivated_at: string | null
  settings: { notifications?: Partial<NotificationPrefs> } | null
}

interface ArtistApplication {
  status: string
  submitted_at: string
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: font,
        fontSize: '0.6rem',
        fontWeight: 700,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        marginBottom: '12px',
      }}
    >
      {children}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
      }}
    >
      {children}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: 44,
        height: 26,
        minWidth: 44,
        minHeight: 44,
        display: 'inline-flex',
        alignItems: 'center',
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          width: 44,
          height: 26,
          borderRadius: 50,
          background: checked ? 'var(--gold)' : 'var(--surface-3)',
          border: `1px solid ${checked ? 'var(--gold-border)' : 'var(--border-hi)'}`,
          transition: 'background 150ms ease, border-color 150ms ease',
          position: 'relative',
          display: 'block',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 20 : 2,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: checked ? 'var(--bg)' : 'var(--text-2)',
            transform: 'translateZ(0)',
            transition: 'left 150ms ease',
          }}
        />
      </span>
    </button>
  )
}

function TierOneButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: font,
        fontWeight: 700,
        fontSize: '0.65rem',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        padding: '14px 24px',
        borderRadius: 50,
        minHeight: 48,
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        background: danger ? '#ff6060' : 'var(--gold)',
        color: danger ? 'var(--text)' : 'var(--bg)',
        transition: 'transform 150ms ease, opacity 150ms ease',
      }}
    >
      {children}
    </button>
  )
}

function TierTwoButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: font,
        fontWeight: 600,
        fontSize: '0.6rem',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        padding: '11px 16px',
        borderRadius: 50,
        minHeight: 44,
        border: '1px solid var(--border)',
        background: 'var(--surface-2)',
        color: 'var(--text-2)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

export default function AccountSettingsPage() {
  const { user, loading: authLoading, hasPasswordAuth } = useAuthGate()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [application, setApplication] = useState<ArtistApplication | null>(null)
  const [notifications, setNotifications] = useState<NotificationPrefs>(DEFAULT_NOTIFICATIONS)

  const [newPassword, setNewPassword] = useState('')
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null)
  const [savingSection, setSavingSection] = useState<string | null>(null)

  const [confirmUsername, setConfirmUsername] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setUserId(null)
      setProfile(null)
      setApplication(null)
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setUserId(user!.id)

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('id, username, is_artist, is_private, who_can_message, deactivated_at, settings')
        .eq('id', user!.id)
        .single()

      if (cancelled) return

      if (profileRow) {
        setProfile(profileRow as ProfileRow)
        setNotifications({
          ...DEFAULT_NOTIFICATIONS,
          ...(profileRow.settings?.notifications ?? {}),
        })
      } else {
        setProfile(null)
      }

      const { data: applicationRow } = await supabase
        .from('artist_applications')
        .select('status, submitted_at')
        .eq('profile_id', user!.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cancelled) return

      if (applicationRow) setApplication(applicationRow as ArtistApplication)
      else setApplication(null)

      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [authLoading, user])

  async function updatePassword() {
    if (newPassword.length < 8) {
      setPasswordStatus('Use at least 8 characters.')
      return
    }
    setPasswordStatus(null)
    setSavingSection('password')
    try {
      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      const body = await res.json().catch(() => ({}))
      setSavingSection(null)
      if (!res.ok) {
        setPasswordStatus(body.error || 'Could not update password.')
        return
      }
      setPasswordStatus('Password updated.')
      setNewPassword('')
    } catch {
      setSavingSection(null)
      setPasswordStatus('Could not reach the server. Try again.')
    }
  }

  async function saveNotifications(next: NotificationPrefs) {
    if (!userId || !profile) return
    setNotifications(next)
    setSavingSection('notifications')
    const nextSettings = { ...(profile.settings ?? {}), notifications: next }
    await supabase.from('profiles').update({ settings: nextSettings }).eq('id', userId)
    setProfile({ ...profile, settings: nextSettings })
    setSavingSection(null)
  }

  async function savePrivacy(patch: Partial<Pick<ProfileRow, 'is_private' | 'who_can_message'>>) {
    if (!userId || !profile) return
    setSavingSection('privacy')
    const updated = { ...profile, ...patch }
    setProfile(updated)
    await supabase.from('profiles').update(patch).eq('id', userId)
    setSavingSection(null)
  }

  async function toggleHidden() {
    if (!userId || !profile) return
    setSavingSection('account')
    const nextValue = profile.deactivated_at ? null : new Date().toISOString()
    await supabase.from('profiles').update({ deactivated_at: nextValue }).eq('id', userId)
    setProfile({ ...profile, deactivated_at: nextValue })
    setSavingSection(null)
  }

  async function deleteAccount() {
    if (!profile || confirmUsername !== profile.username) {
      setDeleteError('Type your exact username to confirm.')
      return
    }
    setDeleteError(null)
    setDeleting(true)

    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmUsername }),
      })
      const body = await res.json()
      if (!res.ok) {
        setDeleteError(body.error || 'Something went wrong. Try again.')
        setDeleting(false)
        return
      }
      await signOutBrowser()
      window.location.href = '/'
    } catch {
      setDeleteError('Could not reach the server. Try again.')
      setDeleting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div style={{ padding: 'calc(var(--nav-height, 72px) + 24px) 24px', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: font }}>
        Loading your settings.
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ padding: 'calc(var(--nav-height, 72px) + 24px) 24px', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: font }}>
        Sign in to view account settings.
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ padding: 'calc(var(--nav-height, 72px) + 24px) 24px', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: font }}>
        Could not load your profile. Try refreshing the page.
      </div>
    )
  }

  return (
    <div
      style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: 'calc(var(--nav-height, 72px) + 24px) 24px var(--margo-page-padding-bottom)',
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <BackButton fallbackHref={`/profile/${profile.username}`} label="Back" />
      </div>

      <h1
        style={{
          fontFamily: font,
          fontSize: '1.5rem',
          fontWeight: 600,
          color: 'var(--text)',
          marginBottom: '32px',
        }}
      >
        Account Settings
      </h1>

      {/* Profile */}
      <Card>
        <SectionLabel>Profile</SectionLabel>
        <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-2)', marginBottom: '16px' }}>
          Bio, signature lyric, and photo live on your profile edit page.
        </p>
        <Link href="/profile/edit">
          <TierTwoButton onClick={() => {}}>Edit Profile</TierTwoButton>
        </Link>
      </Card>

      {/* Security */}
      <Card>
        <SectionLabel>Security</SectionLabel>
        {hasPasswordAuth ? (
          <>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              style={{
                width: '100%',
                fontFamily: font,
                fontSize: '0.95rem',
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                color: 'var(--text)',
                boxSizing: 'border-box',
                marginBottom: '12px',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <TierOneButton onClick={updatePassword} disabled={savingSection === 'password'}>
                Update Password
              </TierOneButton>
              {passwordStatus && (
                <span style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--text-2)' }}>
                  {passwordStatus}
                </span>
              )}
            </div>
          </>
        ) : (
          <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-2)' }}>
            You signed in with Google or Discord, so there is no Margo password to change. Manage
            your password with that provider instead.
          </p>
        )}
      </Card>

      {/* Notifications */}
      <Card>
        <SectionLabel>Notifications</SectionLabel>
        {[
          { key: 'newFollower', label: 'New followers' },
          { key: 'newMessage', label: 'New messages' },
          { key: 'lyricBack', label: 'Lyric Backs on your posts' },
          { key: 'resonate', label: 'Resonates on your posts' },
          { key: 'emailDigest', label: 'Weekly email digest' },
        ].map((row) => (
          <div
            key={row.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text)' }}>
              {row.label}
            </span>
            <Toggle
              checked={notifications[row.key as keyof NotificationPrefs]}
              label={row.label}
              onChange={(v) => saveNotifications({ ...notifications, [row.key]: v })}
            />
          </div>
        ))}
      </Card>

      {/* Privacy */}
      <Card>
        <SectionLabel>Privacy</SectionLabel>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 0',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div>
            <div style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text)' }}>
              Private account
            </div>
            <div style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Only accepted followers can see your lyrics
            </div>
          </div>
          <Toggle
            checked={profile.is_private}
            label="Private account"
            onChange={(v) => savePrivacy({ is_private: v })}
          />
        </div>

        <div style={{ padding: '16px 0 4px' }}>
          <div style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 10 }}>
            Who can message you
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['everyone', 'followers', 'no_one'] as WhoCanMessage[]).map((option) => (
              <button
                key={option}
                onClick={() => savePrivacy({ who_can_message: option })}
                style={{
                  fontFamily: font,
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  padding: '6px 14px',
                  minHeight: 44,
                  borderRadius: 50,
                  border: `1px solid ${profile.who_can_message === option ? 'var(--gold-border)' : 'rgba(255,255,255,0.10)'}`,
                  background: profile.who_can_message === option ? 'var(--gold-faint)' : 'rgba(255,255,255,0.05)',
                  color: profile.who_can_message === option ? 'var(--gold)' : 'var(--text-2)',
                  cursor: 'pointer',
                }}
              >
                {option === 'no_one' ? 'No One' : option === 'everyone' ? 'Everyone' : 'Followers'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Artist status */}
      <Card>
        <SectionLabel>Artist Status</SectionLabel>
        {profile.is_artist ? (
          <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--gold)' }}>
            You are a Verified Artist.
          </p>
        ) : application ? (
          <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-2)' }}>
            Your artist application is{' '}
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{application.status}</span>.
          </p>
        ) : (
          <>
            <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-2)', marginBottom: 16 }}>
              You have not applied as an artist yet.
            </p>
            <Link href="/apply-artist">
              <TierTwoButton onClick={() => {}}>Apply as an Artist</TierTwoButton>
            </Link>
          </>
        )}
      </Card>

      {/* Account: hide + delete */}
      <Card>
        <SectionLabel>Account</SectionLabel>

        <div style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 4 }}>
            {profile.deactivated_at ? 'Your account is hidden' : 'Hide your account'}
          </p>
          <p style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            {profile.deactivated_at
              ? 'Your profile is not visible to others. Bring it back anytime.'
              : 'Your profile becomes invisible to everyone but you. Reversible anytime.'}
          </p>
          <TierTwoButton onClick={toggleHidden} disabled={savingSection === 'account'}>
            {profile.deactivated_at ? 'Unhide My Account' : 'Hide My Account'}
          </TierTwoButton>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
          <p style={{ fontFamily: font, fontSize: '0.9rem', color: '#ff6060', marginBottom: 4 }}>
            Delete your account
          </p>
          <p style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            This permanently removes your profile, messages, and follows. It cannot be undone.
          </p>
          <input
            value={confirmUsername}
            onChange={(e) => setConfirmUsername(e.target.value)}
            placeholder={`Type "${profile.username}" to confirm`}
            style={{
              width: '100%',
              fontFamily: font,
              fontSize: '0.95rem',
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--text)',
              boxSizing: 'border-box',
              marginBottom: '12px',
            }}
          />
          <TierOneButton onClick={deleteAccount} disabled={deleting} danger>
            {deleting ? 'Deleting.' : 'Delete My Account'}
          </TierOneButton>
          {deleteError && (
            <p style={{ fontFamily: font, fontSize: '0.8rem', color: '#ff6060', marginTop: 12 }}>
              {deleteError}
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}