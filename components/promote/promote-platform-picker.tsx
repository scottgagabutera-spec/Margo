'use client'

import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type CSSProperties,
} from 'react'
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  XIcon,
  YouTubeIcon,
  type MargoIconProps,
} from '@/components/icons'
import { EXPORT_SHAPE_HINTS, EXPORT_SHAPE_LABELS } from '@/lib/moment-export/export-shapes'
import { UI_FONT } from '@/lib/fonts'
import type { MomentShapeId } from '@/lib/moment/types'
import type { PromotePlatform } from '@/lib/promote/types'

const font = UI_FONT

const PLATFORM_ICONS: Record<PromotePlatform, ComponentType<MargoIconProps>> = {
  youtube: YouTubeIcon,
  tiktok: TikTokIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  x: XIcon,
}

export interface PromoteEligibilityPlatform {
  id: PromotePlatform
  label: string
  live: boolean
  state: 'selectable' | 'wrong_shape' | 'not_connected' | 'coming_soon' | 'already_published'
  shapeHint: string | null
  connected: boolean
  publishedAt: string | null
  externalPostUrl: string | null
}

interface PromotePlatformPickerProps {
  postId: string
  shapeId: MomentShapeId
  busy?: boolean
  onQueue: (platforms: PromotePlatform[], confirmRepublish: boolean) => void | Promise<void>
}

function formatPublishedDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return null
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function PromotePlatformPicker({
  postId,
  shapeId,
  busy = false,
  onQueue,
}: PromotePlatformPickerProps) {
  const [loading, setLoading] = useState(true)
  const [platforms, setPlatforms] = useState<PromoteEligibilityPlatform[]>([])
  const [selected, setSelected] = useState<Set<PromotePlatform>>(new Set())
  const [confirmRepublishOpen, setConfirmRepublishOpen] = useState(false)

  const loadEligibility = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/promote/queue/eligibility?postId=${encodeURIComponent(postId)}&shapeId=${encodeURIComponent(shapeId)}`,
        { credentials: 'include' },
      )
      if (!res.ok) {
        setPlatforms([])
        setSelected(new Set())
        return
      }
      const json = await res.json()
      const rows = (json.platforms || []) as PromoteEligibilityPlatform[]
      setPlatforms(rows)
      const defaults = (json.defaultSelected || []) as PromotePlatform[]
      setSelected(new Set(defaults))
    } finally {
      setLoading(false)
    }
  }, [postId, shapeId])

  useEffect(() => {
    void loadEligibility()
  }, [loadEligibility])

  const selectedList = useMemo(() => [...selected], [selected])

  const republishSelected = useMemo(
    () => platforms.filter((p) => selected.has(p.id) && p.state === 'already_published'),
    [platforms, selected],
  )

  const canQueue = selectedList.length > 0 && !busy && !loading

  function togglePlatform(platform: PromoteEligibilityPlatform) {
    if (platform.state === 'coming_soon' || platform.state === 'wrong_shape' || platform.state === 'not_connected') {
      return
    }
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(platform.id)) next.delete(platform.id)
      else next.add(platform.id)
      return next
    })
  }

  async function handleQueue(confirmRepublish: boolean) {
    if (!canQueue) return
    if (republishSelected.length > 0 && !confirmRepublish) {
      setConfirmRepublishOpen(true)
      return
    }
    setConfirmRepublishOpen(false)
    await onQueue(selectedList, confirmRepublish)
  }

  if (loading) {
    return (
      <p style={{ fontFamily: font, fontSize: '0.68rem', color: 'var(--text-muted)', margin: 0 }}>
        Loading platforms…
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={{
        fontFamily: font,
        fontSize: '0.68rem',
        color: 'var(--text-muted)',
        margin: 0,
        lineHeight: 1.4,
      }}>
        Size: {EXPORT_SHAPE_LABELS[shapeId]} ({EXPORT_SHAPE_HINTS[shapeId]}) — pick where this export goes.
        Change size above to reach other platforms, then queue again.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {platforms.map((platform) => {
          const Icon = PLATFORM_ICONS[platform.id]
          const isChecked = selected.has(platform.id)
          const disabled = platform.state === 'coming_soon'
            || platform.state === 'wrong_shape'
            || platform.state === 'not_connected'
          const publishedLabel = formatPublishedDate(platform.publishedAt)

          let statusLine: string | null = null
          if (platform.state === 'coming_soon') statusLine = 'Coming soon'
          else if (platform.state === 'wrong_shape') statusLine = platform.shapeHint
          else if (platform.state === 'not_connected') statusLine = 'Connect in Settings'
          else if (platform.state === 'already_published') {
            statusLine = publishedLabel ? `Posted ${publishedLabel}` : 'Posted before'
          }

          return (
            <label
              key={platform.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                minHeight: 'var(--margo-touch-min)',
                padding: '8px 10px',
                borderRadius: '12px',
                border: isChecked ? '1px solid var(--gold-border)' : '1px solid var(--border)',
                background: isChecked ? 'var(--gold-faint)' : 'rgba(255,255,255,0.02)',
                opacity: disabled ? 0.55 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={disabled || busy}
                onChange={() => togglePlatform(platform)}
                style={{ width: 16, height: 16, flexShrink: 0 }}
              />
              <Icon size={18} color={isChecked ? 'var(--gold)' : 'var(--text-secondary)'} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  display: 'block',
                  fontFamily: font,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: isChecked ? 'var(--gold)' : 'var(--text)',
                }}>
                  {platform.label}
                </span>
                {statusLine && (
                  <span style={{
                    display: 'block',
                    fontFamily: font,
                    fontSize: '0.62rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.3,
                    marginTop: '2px',
                  }}>
                    {statusLine}
                    {platform.state === 'not_connected' && platform.live && (
                      <>
                        {' · '}
                        <Link href="/settings" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
                          Settings
                        </Link>
                      </>
                    )}
                    {platform.state === 'already_published' && platform.externalPostUrl && (
                      <>
                        {' · '}
                        <a
                          href={platform.externalPostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--gold)', textDecoration: 'none' }}
                        >
                          View
                        </a>
                      </>
                    )}
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </div>

      {confirmRepublishOpen && republishSelected.length > 0 && (
        <div style={{
          padding: '12px 14px',
          borderRadius: '12px',
          border: '1px solid var(--border-hi)',
          background: 'var(--surface-2)',
        }}>
          <p style={{
            fontFamily: font,
            fontSize: '0.72rem',
            color: 'var(--text)',
            margin: '0 0 10px',
            lineHeight: 1.45,
          }}>
            Already posted to {republishSelected.map((p) => p.label).join(', ')}.
            Queue again only if you want a fresh post there.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => void handleQueue(true)}
              disabled={busy}
              style={primaryBtn}
            >
              Yes, queue again
            </button>
            <button
              type="button"
              onClick={() => setConfirmRepublishOpen(false)}
              disabled={busy}
              style={ghostBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!confirmRepublishOpen && (
        <button
          type="button"
          onClick={() => void handleQueue(false)}
          disabled={!canQueue}
          style={{
            ...primaryBtn,
            width: '100%',
            opacity: canQueue ? 1 : 0.5,
          }}
        >
          {busy ? 'Adding to queue…' : 'Add to promotion queue'}
        </button>
      )}
    </div>
  )
}

const primaryBtn: CSSProperties = {
  fontFamily: font,
  fontSize: '0.58rem',
  fontWeight: 700,
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
  padding: '12px 16px',
  borderRadius: '999px',
  border: '1px solid var(--gold-border)',
  background: 'var(--gold-faint)',
  color: 'var(--gold)',
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
}

const ghostBtn: CSSProperties = {
  ...primaryBtn,
  background: 'transparent',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border)',
}
