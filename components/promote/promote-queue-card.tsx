'use client'

import { useCallback, useMemo, useState, type CSSProperties } from 'react'
import { StageMomentCard } from '@/components/stage/stage-moment-card'
import { MomentExportCustomizeBar } from '@/components/moment-export-customize-bar'
import { UI_FONT } from '@/lib/fonts'
import { buildPromoteQueueMoment } from '@/lib/promote/build-queue-moment'
import { publishQueueMomentVideo } from '@/lib/promote/publish-client'
import type { PromoteQueueRow } from '@/lib/promote/types'
import type { AtmosphereId } from '@/lib/atmosphere'
import type { MomentShapeId } from '@/lib/moment/types'
import type { StageCardThemeId } from '@/lib/moment/stage-theme'
import { isLivingAtmosphere, parseAtmosphere } from '@/lib/atmosphere'

const font = UI_FONT

interface PromoteQueueCardProps {
  item: PromoteQueueRow
  audioUrl?: string | null
  snippetStart?: number | null
  snippetEnd?: number | null
  onUpdated: () => void
}

export function PromoteQueueCard({
  item,
  audioUrl,
  snippetStart,
  snippetEnd,
  onUpdated,
}: PromoteQueueCardProps) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [themeId, setThemeId] = useState<StageCardThemeId>(
    (item.overrideThemeId ?? item.defaultThemeId) as StageCardThemeId,
  )
  const [atmosphereId, setAtmosphereId] = useState<AtmosphereId>(
    item.overrideAtmosphereId ?? item.defaultAtmosphereId,
  )
  const [shapeId] = useState<MomentShapeId>(item.overrideShapeId ?? item.defaultShapeId)

  const previewRow = useMemo<PromoteQueueRow>(() => ({
    ...item,
    overrideThemeId: themeId,
    overrideAtmosphereId: atmosphereId,
    overrideShapeId: shapeId,
  }), [item, themeId, atmosphereId, shapeId])

  const previewMoment = useMemo(
    () => buildPromoteQueueMoment(previewRow, { audioUrl, snippetStart, snippetEnd }),
    [previewRow, audioUrl, snippetStart, snippetEnd],
  )

  const saveOverrides = useCallback(async () => {
    const res = await fetch(`/api/promote/queue/${item.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        overrideThemeId: themeId,
        overrideAtmosphereId: atmosphereId,
        overrideShapeId: shapeId,
      }),
    })
    if (!res.ok) throw new Error('Could not save changes')
  }, [item.id, themeId, atmosphereId, shapeId])

  const runPublish = useCallback(async () => {
    setBusy('Rendering and uploading to YouTube…')
    setError(null)
    try {
      await saveOverrides()
      await publishQueueMomentVideo(item.id, previewMoment, (msg) => setBusy(msg))
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setBusy(null)
    }
  }, [item.id, previewMoment, saveOverrides, onUpdated])

  async function approve() {
    setBusy('Approving…')
    setError(null)
    try {
      await saveOverrides()
      const res = await fetch(`/api/promote/queue/${item.id}/approve`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Approve failed')
      onUpdated()
      await runPublish()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed')
      setBusy(null)
    }
  }

  async function reject() {
    setBusy('Rejecting…')
    await fetch(`/api/promote/queue/${item.id}/reject`, { method: 'POST', credentials: 'include' })
    setBusy(null)
    onUpdated()
  }

  const youtubeTarget = item.targets.find((t) => t.platform === 'youtube')
  const canEdit = item.status === 'pending_review'
  const canPublish = item.status === 'approved' || item.status === 'partial'

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
      }}
    >
      <div style={{ fontFamily: font, fontSize: '0.65rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
        {item.status.replace('_', ' ')}
      </div>
      <div style={{ fontFamily: font, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
        {item.songTitle}
      </div>
      <div style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', whiteSpace: 'pre-line' }}>
        {item.lyricText}
      </div>

      <div style={{ maxWidth: 280, margin: '0 auto 16px' }}>
        <StageMomentCard
          lyric={previewMoment.lines[0]?.lyric || ''}
          songTitle={previewMoment.lines[0]?.songTitle || ''}
          artistName={previewMoment.lines[0]?.artistName || ''}
          artwork={previewMoment.lines[0]?.artworkUrl}
          vibeLabel={previewMoment.vibeLabel}
          cardThemeId={previewMoment.themeId as StageCardThemeId}
          atmosphereId={previewMoment.exportAtmosphereId}
          shapeId={previewMoment.shapeId}
          canPlay={false}
          effectOwnsFill
        />
      </div>

      {canEdit && (
        <MomentExportCustomizeBar
          cardThemeId={themeId}
          onThemeChange={(id) => {
            setThemeId(id)
            setAtmosphereId('still')
          }}
          exportAtmosphereId={atmosphereId}
          onExportAtmosphereChange={(next) => {
            const resolved = typeof next === 'function' ? next(atmosphereId) : next
            setAtmosphereId(resolved)
            if (isLivingAtmosphere(parseAtmosphere(resolved))) {
              /* effect mode — color fill handled by resolveExportPaintTheme */
            }
          }}
          shapeId={shapeId}
          onShapeChange={() => {}}
          style={{ marginBottom: '16px', opacity: shapeId === 'vertical' ? 1 : 0.6 }}
        />
      )}

      {shapeId !== 'vertical' && (
        <p style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--gold)', marginBottom: '12px' }}>
          YouTube Shorts require a 9:16 export — re-export this Moment as Shorts before promoting.
        </p>
      )}

      {youtubeTarget?.externalPostUrl && (
        <a
          href={youtubeTarget.externalPostUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily: font, color: 'var(--gold)', fontSize: '0.85rem' }}
        >
          View on YouTube
        </a>
      )}

      {youtubeTarget?.errorMessage && (
        <p style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--danger, #e55)', marginTop: '8px' }}>
          {youtubeTarget.errorMessage}
        </p>
      )}

      {error && (
        <p style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--danger, #e55)', marginTop: '8px' }}>{error}</p>
      )}

      {busy && (
        <p style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>{busy}</p>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
        {canEdit && (
          <>
            <button
              type="button"
              onClick={() => void approve()}
              disabled={!!busy || shapeId !== 'vertical'}
              style={primaryBtn}
            >
              Approve & publish
            </button>
            <button type="button" onClick={() => void reject()} disabled={!!busy} style={ghostBtn}>
              Reject
            </button>
          </>
        )}
        {canPublish && shapeId === 'vertical' && (
          <button type="button" onClick={() => void runPublish()} disabled={!!busy} style={primaryBtn}>
            Publish to YouTube
          </button>
        )}
      </div>
    </div>
  )
}

const primaryBtn: CSSProperties = {
  fontFamily: font,
  fontSize: '0.72rem',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  padding: '10px 16px',
  borderRadius: '999px',
  border: '1px solid var(--gold-border)',
  background: 'var(--gold-faint)',
  color: 'var(--gold)',
  cursor: 'pointer',
}

const ghostBtn: CSSProperties = {
  ...primaryBtn,
  background: 'transparent',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border)',
}
