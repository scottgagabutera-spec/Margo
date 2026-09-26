'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TYPE, UI_FONT } from '@/lib/fonts'
import { MARGO_AUTO_PROMOTE_SETTINGS_PATH } from '@/lib/promote/settings-anchor'
import type { PromotePlatform } from '@/lib/promote/types'

const font = UI_FONT
const CONNECT_NAV_TIMEOUT_MS = 10_000

type Variant = 'primary' | 'textLink'

interface PromoteOAuthConnectButtonProps {
  platform: PromotePlatform
  oauthPath: string
  label: string
  variant?: Variant
  disabled?: boolean
  onNavigateError?: (message: string) => void
}

function buildOAuthStartHref(oauthPath: string): string {
  return `${oauthPath}?returnTo=${encodeURIComponent(MARGO_AUTO_PROMOTE_SETTINGS_PATH)}`
}

function platformConnectErrorLabel(platform: PromotePlatform): string {
  if (platform === 'facebook') return 'Facebook'
  if (platform === 'youtube') return 'YouTube'
  if (platform === 'tiktok') return 'TikTok'
  return 'Account'
}

export function PromoteOAuthConnectButton({
  platform,
  oauthPath,
  label,
  variant = 'primary',
  disabled = false,
  onNavigateError,
}: PromoteOAuthConnectButtonProps) {
  const [connecting, setConnecting] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const href = buildOAuthStartHref(oauthPath)

  const clearTimer = useCallback(() => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => () => clearTimer(), [clearTimer])

  const startConnect = useCallback(() => {
    if (disabled || connecting) return
    setConnecting(true)
    clearTimer()
    timeoutRef.current = setTimeout(() => {
      setConnecting(false)
      const name = platformConnectErrorLabel(platform)
      onNavigateError?.(
        `${name} sign-in did not start in time. Check your connection and try again.`,
      )
    }, CONNECT_NAV_TIMEOUT_MS)

    // Full document navigation — required for OAuth (Route Handler 302 must not be soft-fetched).
    window.location.assign(href)
  }, [clearTimer, connecting, disabled, href, onNavigateError, platform])

  if (variant === 'textLink') {
    return (
      <button
        type="button"
        onClick={startConnect}
        disabled={disabled || connecting}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--gold)',
          fontFamily: font,
          fontSize: TYPE.secondary,
          cursor: disabled || connecting ? 'default' : 'pointer',
          padding: 0,
          opacity: disabled || connecting ? 0.6 : 1,
        }}
      >
        {connecting ? 'Connecting…' : label}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={startConnect}
      disabled={disabled || connecting}
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
        background: 'transparent',
        cursor: disabled || connecting ? 'default' : 'pointer',
        opacity: disabled || connecting ? 0.6 : 1,
      }}
    >
      {connecting ? 'Connecting…' : label}
    </button>
  )
}
