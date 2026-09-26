'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
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
import { connectionSettingsNotice } from '@/lib/promote/connection-settings-copy'
import {
  buildPathAfterPromoteOAuthHandled,
  readPromoteOAuthReturnParam,
} from '@/lib/promote/oauth-return-redirect'
import {
  MARGO_AUTO_PROMOTE_SETTINGS_PATH,
  scrollToAutoPromoteSettings,
} from '@/lib/promote/settings-anchor'
import {
  readPromoteConnectionsSessionCache,
  writePromoteConnectionsSessionCache,
} from '@/lib/promote/promote-connections-session-cache'
import { PromoteInlineStatus } from '@/components/promote/promote-page-shell'
import { PromoteOAuthConnectButton } from '@/components/promote/promote-oauth-connect-button'
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
  const cachedOnMount = readPromoteConnectionsSessionCache()
  const [connections, setConnections] = useState<SocialConnectionPublic[]>(
    () => cachedOnMount?.connections ?? [],
  )
  const [publishMode, setPublishMode] = useState<PromotePublishMode>(
    () => cachedOnMount?.publishMode ?? 'review',
  )
  const [bootstrapping, setBootstrapping] = useState(() => !cachedOnMount)
  const [refreshing, setRefreshing] = useState(false)
  const lastFetchAtRef = useRef(cachedOnMount ? Date.now() : 0)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [facebookPages, setFacebookPages] = useState<FacebookPageOption[]>([])
  const [selectedFacebookPageId, setSelectedFacebookPageId] = useState<string>('')
  const [showFacebookPagePicker, setShowFacebookPagePicker] = useState(false)
  const [facebookPagesLoading, setFacebookPagesLoading] = useState(false)
  const [platformHighlight, setPlatformHighlight] = useState<PromotePlatform | null>(null)

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? (readPromoteConnectionsSessionCache() != null)
    if (silent) setRefreshing(true)
    else setBootstrapping(true)
    try {
      const [connRes, settingsRes] = await Promise.all([
        fetch('/api/promote/connections', { credentials: 'include' }),
        fetch('/api/promote/settings', { credentials: 'include' }),
      ])
      let nextConnections: SocialConnectionPublic[] = []
      let nextMode: PromotePublishMode = 'review'
      if (connRes.ok) {
        const json = await connRes.json()
        nextConnections = json.connections || []
        setConnections(nextConnections)
      }
      if (settingsRes.ok) {
        const json = await settingsRes.json()
        nextMode = json.settings?.publishMode === 'auto' ? 'auto' : 'review'
        setPublishMode(nextMode)
      }
      writePromoteConnectionsSessionCache(nextConnections, nextMode)
      lastFetchAtRef.current = Date.now()
    } finally {
      setBootstrapping(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash.includes('margo-auto-promote')) {
      requestAnimationFrame(() => scrollToAutoPromoteSettings('instant'))
    }
  }, [])

  useEffect(() => {
    void (async () => {
      if (typeof window === 'undefined') return
      const promote = readPromoteOAuthReturnParam(
        window.location.search,
        window.location.hash,
      )
      let oauthReturn = false

      if (promote === 'youtube_connected') {
        setPlatformHighlight('youtube')
        setMessage('YouTube connected.')
        oauthReturn = true
      }
      if (promote === 'youtube_error') setMessage('YouTube connection failed — try again.')
      if (promote === 'youtube_denied') setMessage('YouTube connection was cancelled.')
      if (promote === 'youtube_invalid') {
        setMessage('YouTube link expired — tap Connect YouTube again in the same browser.')
      }
      if (promote === 'facebook_connected') {
        setPlatformHighlight('facebook')
        setMessage('Facebook Page connected.')
        oauthReturn = true
      }
      if (promote === 'facebook_error') setMessage('Facebook connection failed — try again.')
      if (promote === 'facebook_denied') setMessage('Facebook connection was cancelled.')
      if (promote === 'facebook_invalid') setMessage('Facebook connection expired — try again.')
      if (promote === 'facebook_no_pages') setMessage('No Facebook Pages found — you must admin a Page to connect.')
      if (promote === 'facebook_pick_page') setShowFacebookPagePicker(true)
      if (promote === 'tiktok_connected') {
        setPlatformHighlight('tiktok')
        setMessage('TikTok connected.')
        oauthReturn = true
      }
      if (promote === 'tiktok_error') {
        setMessage('TikTok connection failed — check sandbox credentials in Vercel, then try Connect again.')
      }
      if (promote === 'tiktok_denied') setMessage('TikTok connection was cancelled.')
      if (promote === 'tiktok_invalid') {
        setMessage('TikTok link expired — tap Connect TikTok again (stay in the same browser if you can).')
      }
      if (promote === 'server_error') {
        setMessage('Connection could not finish — server configuration may be missing. Try again or contact support.')
      }
      if (promote === 'denied') setMessage('Auto-Promote is available to active verified artists only.')

      if (promote) {
        window.history.replaceState(
          null,
          '',
          buildPathAfterPromoteOAuthHandled(
            window.location.pathname,
            window.location.search,
            window.location.hash,
          ),
        )
      }

      if (oauthReturn || promote) {
        await load({ silent: true })
        requestAnimationFrame(() => scrollToAutoPromoteSettings('smooth'))
      }
    })()
  }, [load])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastFetchAtRef.current < 2 * 60 * 1000) return
      void load({ silent: true })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [load])

  useEffect(() => {
    if (!showFacebookPagePicker) return
    let cancelled = false
    setFacebookPagesLoading(true)
    void (async () => {
      try {
        const res = await fetch('/api/promote/oauth/facebook/pages', { credentials: 'include' })
        if (cancelled) return
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
      } finally {
        if (!cancelled) setFacebookPagesLoading(false)
      }
    })()
    return () => { cancelled = true }
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
    setMessage(null)
    const res = await fetch('/api/promote/connections', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform }),
    })
    setSaving(false)
    if (res.ok) {
      setPlatformHighlight(null)
      setMessage(`${platform === 'tiktok' ? 'TikTok' : platform} disconnected in Margo. Revoke the app in TikTok too if you want the consent screen again.`)
      void load({ silent: true })
      scrollToAutoPromoteSettings('smooth')
    } else {
      const json = await res.json().catch(() => ({}))
      setMessage(typeof json.error === 'string' ? json.error : 'Could not disconnect — try again.')
      scrollToAutoPromoteSettings('smooth')
    }
  }

  if (bootstrapping && connections.length === 0) {
    return <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)' }}>Loading connected accounts…</p>
  }

  const liveCount = PROMOTE_PLATFORM_DEFS.filter((p) => p.live).length
  const connectedCount = connections.filter((c) => c.status === 'connected').length

  return (
    <div>
      {refreshing && <PromoteInlineStatus message="Updating connected accounts…" tone="gold" />}
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

      {showFacebookPagePicker && facebookPagesLoading && (
        <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Loading your Facebook Pages…
        </p>
      )}

      {showFacebookPagePicker && !facebookPagesLoading && facebookPages.length > 0 && (
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
          const connectionNotice = connection ? connectionSettingsNotice(connection) : null

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
                  {platformHighlight === platform.id && (
                    <p style={{ color: 'var(--gold)', margin: '0 0 8px', fontWeight: 600 }}>
                      Connected successfully.
                    </p>
                  )}
                  Connected as {connection?.externalUsername || `${platform.label} account`}
                  {connectionNotice && (
                    <div style={{ color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.45, fontSize: TYPE.secondary }}>
                      {connectionNotice}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {platform.oauthPath && (
                      <PromoteOAuthConnectButton
                        platform={platform.id}
                        oauthPath={platform.oauthPath}
                        label="Reconnect"
                        variant="textLink"
                        disabled={saving}
                        onNavigateError={setMessage}
                      />
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
                    <PromoteOAuthConnectButton
                      platform={platform.id}
                      oauthPath={platform.oauthPath}
                      label={`Connect ${platform.label}`}
                      disabled={saving}
                      onNavigateError={setMessage}
                    />
                  )}
                  {connection?.status === 'expired' && (
                    <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.45 }}>
                      Session expired — reconnect to publish again.
                      {connectionNotice && (
                        <>
                          {' '}
                          {connectionNotice}
                        </>
                      )}
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
