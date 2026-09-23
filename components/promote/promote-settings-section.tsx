'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  XIcon,
  YouTubeIcon,
  type MargoIconProps,
} from '@/components/icons'
import { TYPE, UI_FONT } from '@/lib/fonts'
import { PROMOTE_PLATFORM_DEFS } from '@/lib/promote/platforms'
import { getPlatformSetupGuide } from '@/lib/promote/platform-setup-guide'
import type { PromotePlatform, PromotePublishMode, SocialConnectionPublic } from '@/lib/promote/types'
import type { ComponentType } from 'react'

const font = UI_FONT

const PLATFORM_ICONS: Record<PromotePlatform, ComponentType<MargoIconProps>> = {
  youtube: YouTubeIcon,
  tiktok: TikTokIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  x: XIcon,
}

interface PromoteSettingsSectionProps {
  /** Active verified artist only — parent gates on is_artist + artist_status active */
}

type FacebookPageOption = { id: string; name: string }

export function PromoteSettingsSection(_props: PromoteSettingsSectionProps) {
  const [connections, setConnections] = useState<SocialConnectionPublic[]>([])
  const [publishMode, setPublishMode] = useState<PromotePublishMode>('review')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [facebookPages, setFacebookPages] = useState<FacebookPageOption[]>([])
  const [selectedFacebookPageId, setSelectedFacebookPageId] = useState<string>('')
  const [showFacebookPagePicker, setShowFacebookPagePicker] = useState(false)

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
      if (promote === 'facebook_connected') setMessage('Facebook Page connected.')
      if (promote === 'facebook_error') setMessage('Facebook connection failed — try again.')
      if (promote === 'facebook_denied') setMessage('Facebook connection was cancelled.')
      if (promote === 'facebook_invalid') setMessage('Facebook connection expired — try again.')
      if (promote === 'facebook_no_pages') setMessage('No Facebook Pages found — you must admin a Page to connect.')
      if (promote === 'facebook_pick_page') setShowFacebookPagePicker(true)
      if (promote === 'tiktok_connected') setMessage('TikTok connected.')
      if (promote === 'tiktok_error') setMessage('TikTok connection failed — try again.')
      if (promote === 'tiktok_denied') setMessage('TikTok connection was cancelled.')
      if (promote === 'tiktok_invalid') setMessage('TikTok connection expired — try again.')
      if (promote === 'denied') setMessage('Auto-Promote is available to active verified artists only.')
    }
  }, [load])

  useEffect(() => {
    if (!showFacebookPagePicker) return
    void (async () => {
      const res = await fetch('/api/promote/oauth/facebook/pages', { credentials: 'include' })
      if (!res.ok) {
        setMessage('Could not load your Facebook Pages — try connecting again.')
        setShowFacebookPagePicker(false)
        return
      }
      const json = await res.json()
      const pages = (json.pages || []) as FacebookPageOption[]
      if (pages.length === 0) {
        setMessage('Page selection expired — connect Facebook again.')
        setShowFacebookPagePicker(false)
        return
      }
      setFacebookPages(pages)
      setSelectedFacebookPageId(pages[0]?.id ?? '')
    })()
  }, [showFacebookPagePicker])

  async function confirmFacebookPage() {
    if (!selectedFacebookPageId) return
    setSaving(true)
    setMessage(null)
    const res = await fetch('/api/promote/oauth/facebook/pages', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId: selectedFacebookPageId }),
    })
    setSaving(false)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setMessage(json.error || 'Could not connect that Facebook Page.')
      return
    }
    setShowFacebookPagePicker(false)
    setFacebookPages([])
    setMessage('Facebook Page connected.')
    void load()
  }

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

  async function disconnectPlatform(platform: PromotePlatform) {
    setSaving(true)
    const res = await fetch('/api/promote/connections', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform }),
    })
    setSaving(false)
    if (res.ok) void load()
  }

  if (loading) {
    return <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)' }}>Loading connected accounts…</p>
  }

  const liveCount = PROMOTE_PLATFORM_DEFS.filter((p) => p.live).length
  const connectedCount = connections.filter((c) => c.status === 'connected').length

  return (
    <div>
      {message && (
        <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--gold)', marginBottom: '12px' }}>{message}</p>
      )}

      <p style={{
        fontFamily: font,
        fontSize: TYPE.secondary,
        color: 'var(--text-secondary)',
        marginBottom: '20px',
        lineHeight: 1.45,
      }}>
        Connect accounts here, then choose which platforms each export goes to from the export sheet.
        YouTube, Facebook Page, and TikTok are live today; Instagram and X are coming soon.
        Facebook connects a Page you manage — not a personal profile.
      </p>

      {showFacebookPagePicker && facebookPages.length > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--gold-border)',
          background: 'var(--gold-faint)',
        }}>
          <p style={{ fontFamily: font, fontSize: TYPE.body, fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
            Choose a Facebook Page
          </p>
          <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.45 }}>
            Margo publishes to Pages only. Pick which Page to use for Auto-Promote.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            {facebookPages.map((page) => (
              <label key={page.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="facebook_page"
                  checked={selectedFacebookPageId === page.id}
                  onChange={() => setSelectedFacebookPageId(page.id)}
                />
                <span style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text)' }}>{page.name}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void confirmFacebookPage()}
            disabled={saving || !selectedFacebookPageId}
            style={{
              padding: '10px 18px',
              borderRadius: '999px',
              border: '1px solid var(--gold-border)',
              background: 'transparent',
              color: 'var(--gold)',
              fontFamily: font,
              fontSize: TYPE.label,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            Connect Page
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
        {PROMOTE_PLATFORM_DEFS.map((platform) => {
          const Icon = PLATFORM_ICONS[platform.id]
          const connection = connections.find((c) => c.platform === platform.id)
          const connected = connection?.status === 'connected'

          return (
            <div key={platform.id}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '6px',
              }}>
                <Icon size={18} color={connected ? 'var(--gold)' : 'var(--text-muted)'} />
                <div style={{ fontFamily: font, fontSize: TYPE.body, fontWeight: 600, color: 'var(--text)' }}>
                  {platform.label}
                </div>
                {!platform.live && (
                  <span style={{
                    fontFamily: font,
                    fontSize: '0.58rem',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: '1px solid var(--border)',
                  }}>
                    Coming soon
                  </span>
                )}
              </div>

              {(() => {
                const guide = getPlatformSetupGuide(platform.id)
                return (
                  <p style={{
                    fontFamily: font,
                    fontSize: TYPE.secondary,
                    color: 'var(--text-muted)',
                    margin: '0 0 8px',
                    lineHeight: 1.45,
                  }}>
                    {guide.margoStatus}
                  </p>
                )
              })()}

              {!platform.live ? (
                <ul style={{
                  fontFamily: font,
                  fontSize: TYPE.secondary,
                  color: 'var(--text-muted)',
                  margin: '0 0 8px',
                  paddingLeft: '18px',
                  lineHeight: 1.45,
                }}>
                  {getPlatformSetupGuide(platform.id).artistSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              ) : connected ? (
                <div style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)' }}>
                  Connected as {connection?.externalUsername || `${platform.label} account`}
                  {connection?.lastError && (
                    <div style={{ color: 'var(--text-secondary)', marginTop: '6px' }}>{connection.lastError}</div>
                  )}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {platform.oauthPath && (
                      <a
                        href={`${platform.oauthPath}?returnTo=/settings`}
                        style={{ color: 'var(--gold)', fontSize: TYPE.secondary, textDecoration: 'none' }}
                      >
                        Reconnect
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => void disconnectPlatform(platform.id)}
                      disabled={saving}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontFamily: font,
                        fontSize: TYPE.secondary,
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
                  <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    Connect {platform.label} to include it when you promote.
                  </p>
                  {platform.oauthPath && (
                    <a
                      href={`${platform.oauthPath}?returnTo=/settings`}
                      style={{
                        display: 'inline-block',
                        padding: '10px 18px',
                        borderRadius: '999px',
                        border: '1px solid var(--gold-border)',
                        color: 'var(--gold)',
                        fontFamily: font,
                        fontSize: TYPE.label,
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        textDecoration: 'none',
                      }}
                    >
                      Connect {platform.label}
                    </a>
                  )}
                  {connection?.status === 'expired' && (
                    <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)', marginTop: '8px' }}>
                      Session expired — reconnect to publish again.
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontFamily: font, fontSize: TYPE.body, fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
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
          <span style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)' }}>
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
          <span style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)' }}>
            Post automatically to the platforms you select using the Moment&apos;s export look
          </span>
        </label>
      </div>

      <Link
        href="/studio/promote"
        style={{
          fontFamily: font,
          fontSize: TYPE.secondary,
          color: 'var(--gold)',
          textDecoration: 'none',
        }}
      >
        Open promotion queue →
      </Link>
    </div>
  )
}
