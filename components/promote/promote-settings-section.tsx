'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { UI_FONT } from '@/lib/fonts'
import type { PromotePublishMode, SocialConnectionPublic } from '@/lib/promote/types'

const font = UI_FONT

interface PromoteSettingsSectionProps {
  /** Active verified artist only — parent gates on is_artist + artist_status active */
}

export function PromoteSettingsSection(_props: PromoteSettingsSectionProps) {
  const [connections, setConnections] = useState<SocialConnectionPublic[]>([])
  const [publishMode, setPublishMode] = useState<PromotePublishMode>('review')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [connRes, settingsRes] = await Promise.all([
        fetch('/api/promote/connections', { credentials: 'include' }),
        fetch('/api/promote/settings', { credentials: 'include' }),
      ])
      if (connRes.ok) {
        const json = await connRes.json()
        setConnections(json.connections || [])
      }
      if (settingsRes.ok) {
        const json = await settingsRes.json()
        setPublishMode(json.settings?.publishMode === 'auto' ? 'auto' : 'review')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const promote = params.get('promote')
      if (promote === 'youtube_connected') setMessage('YouTube connected.')
      if (promote === 'youtube_error') setMessage('YouTube connection failed — try again.')
      if (promote === 'youtube_denied') setMessage('YouTube connection was cancelled.')
      if (promote === 'denied') setMessage('Auto-Promote is available to active verified artists only.')
    }
  }, [load])

  const youtube = connections.find((c) => c.platform === 'youtube')

  async function savePublishMode(next: PromotePublishMode) {
    setSaving(true)
    setMessage(null)
    const prev = publishMode
    setPublishMode(next)
    const res = await fetch('/api/promote/settings', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publishMode: next }),
    })
    setSaving(false)
    if (!res.ok) {
      setPublishMode(prev)
      setMessage('Could not save publishing preference.')
    }
  }

  async function disconnectYouTube() {
    setSaving(true)
    const res = await fetch('/api/promote/connections', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'youtube' }),
    })
    setSaving(false)
    if (res.ok) void load()
  }

  if (loading) {
    return <p style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading connected accounts…</p>
  }

  return (
    <div>
      {message && (
        <p style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--gold)', marginBottom: '12px' }}>{message}</p>
      )}

      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontFamily: font, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          YouTube
        </div>
        {youtube?.status === 'connected' ? (
          <div style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Connected as {youtube.externalUsername || 'YouTube channel'}
            {youtube.lastError && (
              <div style={{ color: 'var(--danger, #e55)', marginTop: '6px' }}>{youtube.lastError}</div>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
              <a
                href="/api/promote/oauth/youtube?returnTo=/settings"
                style={{ color: 'var(--gold)', fontSize: '0.8rem', textDecoration: 'none' }}
              >
                Reconnect
              </a>
              <button
                type="button"
                onClick={() => void disconnectYouTube()}
                disabled={saving}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontFamily: font,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Connect your YouTube channel to publish Shorts from Margo.
            </p>
            <a
              href="/api/promote/oauth/youtube?returnTo=/settings"
              style={{
                display: 'inline-block',
                padding: '10px 18px',
                borderRadius: '999px',
                border: '1px solid var(--gold-border)',
                color: 'var(--gold)',
                fontFamily: font,
                fontSize: '0.72rem',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              Connect YouTube
            </a>
            {youtube?.status === 'expired' && (
              <p style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--danger, #e55)', marginTop: '8px' }}>
                Session expired — reconnect to publish again.
              </p>
            )}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontFamily: font, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Publishing preference
        </div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="publish_mode"
            checked={publishMode === 'review'}
            onChange={() => void savePublishMode('review')}
            disabled={saving}
          />
          <span style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Review each post before it publishes
          </span>
        </label>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="publish_mode"
            checked={publishMode === 'auto'}
            onChange={() => void savePublishMode('auto')}
            disabled={saving}
          />
          <span style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Post automatically using the Moment&apos;s export look
          </span>
        </label>
      </div>

      <Link
        href="/studio/promote"
        style={{
          fontFamily: font,
          fontSize: '0.8rem',
          color: 'var(--gold)',
          textDecoration: 'none',
        }}
      >
        Open promotion queue →
      </Link>
    </div>
  )
}
