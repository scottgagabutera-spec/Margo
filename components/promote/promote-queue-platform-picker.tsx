'use client'

import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from 'react'
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  XIcon,
  YouTubeIcon,
  type MargoIconProps,
} from '@/components/icons'
import { TYPE, UI_FONT } from '@/lib/fonts'
import type { QueueItemPlatformRow } from '@/lib/promote/queue-item-platforms'
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

function formatPublishedDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return null
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface PromoteQueuePlatformPickerProps {
  queueId: string
  shapeId: MomentShapeId
  disabled?: boolean
  selected: PromotePlatform[]
  onSelectedChange: (platforms: PromotePlatform[]) => void
  onPlatformsLoaded?: (payload: {
    platforms: QueueItemPlatformRow[]
    selectedPlatforms: PromotePlatform[]
  }) => void
}

export function PromoteQueuePlatformPicker({
  queueId,
  shapeId,
  disabled = false,
  selected,
  onSelectedChange,
  onPlatformsLoaded,
}: PromoteQueuePlatformPickerProps) {
  const [loading, setLoading] = useState(true)
  const [platforms, setPlatforms] = useState<QueueItemPlatformRow[]>([])

  const loadPlatforms = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/promote/queue/${encodeURIComponent(queueId)}/platforms?shapeId=${encodeURIComponent(shapeId)}`,
        { credentials: 'include' },
      )
      if (!res.ok) {
        setPlatforms([])
        onPlatformsLoaded?.({ platforms: [], selectedPlatforms: [] })
        return
      }
      const json = await res.json()
      const rows = (json.platforms || []) as QueueItemPlatformRow[]
      const nextSelected = (json.selectedPlatforms || []) as PromotePlatform[]
      setPlatforms(rows)
      onPlatformsLoaded?.({ platforms: rows, selectedPlatforms: nextSelected })
    } finally {
      setLoading(false)
    }
  }, [queueId, shapeId, onPlatformsLoaded])

  useEffect(() => {
    void loadPlatforms()
  }, [loadPlatforms])

  const selectedSet = useMemo(() => new Set(selected), [selected])

  function togglePlatform(platform: QueueItemPlatformRow) {
    if (platform.state !== 'selectable' && platform.state !== 'already_published') return
    const next = new Set(selectedSet)
    if (next.has(platform.id)) next.delete(platform.id)
    else next.add(platform.id)
    onSelectedChange([...next])
  }

  if (loading) {
    return (
      <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-muted)', margin: 0 }}>
        Loading platforms…
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {platforms.map((platform) => {
        const Icon = PLATFORM_ICONS[platform.id]
        const isChecked = selectedSet.has(platform.id)
        const checkboxDisabled = disabled
          || platform.state === 'coming_soon'
          || platform.state === 'wrong_shape'
          || platform.state === 'not_connected'
          || platform.state === 'published'
          || platform.state === 'locked'
        const publishedLabel = formatPublishedDate(platform.publishedAt)

        let statusLine: string | null = null
        if (platform.state === 'coming_soon') statusLine = 'Coming soon'
        else if (platform.state === 'wrong_shape') statusLine = platform.shapeHint
        else if (platform.state === 'not_connected') statusLine = 'Connect in Settings'
        else if (platform.state === 'published') statusLine = 'Published from this queue item'
        else if (platform.state === 'locked') statusLine = platform.targetStatus?.replace('_', ' ') ?? 'Unavailable'
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
              opacity: checkboxDisabled ? 0.55 : 1,
              cursor: checkboxDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={isChecked}
              disabled={checkboxDisabled}
              onChange={() => togglePlatform(platform)}
              style={{ width: 16, height: 16, flexShrink: 0 }}
            />
            <Icon size={18} color={isChecked ? 'var(--gold)' : 'var(--text-secondary)'} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{
                display: 'block',
                fontFamily: font,
                fontSize: TYPE.secondary,
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
  )
}
