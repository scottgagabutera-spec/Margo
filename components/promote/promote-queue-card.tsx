'use client'

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { StageMomentCard } from '@/components/stage/stage-moment-card'
import { MomentExportCustomizeBar } from '@/components/moment-export-customize-bar'
import { MomentExportPreviewFrame } from '@/components/moment-export-preview-frame'
import { UI_FONT } from '@/lib/fonts'
import { playSnippet } from '@/lib/audio-engine'
import { useSnippetPlaybackUi } from '@/hooks/useAudioEngine'
import { useSongAtmosphere } from '@/hooks/useSongAtmosphere'
import { livingAtmosphereOrNull } from '@/lib/atmosphere'
import { resolveMomentListen } from '@/lib/moment'
import { buildPromoteQueueMoment } from '@/lib/promote/build-queue-moment'
import { publishQueueMomentVideo } from '@/lib/promote/publish-client'
import type { PromoteQueueRow } from '@/lib/promote/types'
import type { AtmosphereId } from '@/lib/atmosphere'
import type { MomentShapeId } from '@/lib/moment/types'
import type { StageCardThemeId } from '@/lib/moment/stage-theme'

const font = UI_FONT

function asStageTheme(id: string | null | undefined): StageCardThemeId {
  if (id === 'blush' || id === 'sage' || id === 'dusk' || id === 'gold') return id
  return 'gold'
}

interface PromoteQueueCardProps {
  item: PromoteQueueRow
  audioUrl?: string | null
  songId?: string | null
  snippetStart?: number | null
  snippetEnd?: number | null
  onUpdated: () => void
}

export function PromoteQueueCard({
  item,
  audioUrl,
  songId,
  snippetStart,
  snippetEnd,
  onUpdated,
}: PromoteQueueCardProps) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [themeId, setThemeId] = useState<StageCardThemeId>(
    asStageTheme(item.overrideThemeId ?? item.defaultThemeId),
  )
  const [atmosphereId, setAtmosphereId] = useState<AtmosphereId>(
    item.overrideAtmosphereId ?? item.defaultAtmosphereId,
  )
  const [shapeId] = useState<MomentShapeId>(item.overrideShapeId ?? item.defaultShapeId)

  const resolvedSongId = songId ?? item.sourceSongId ?? null
  const resolvedStart = snippetStart ?? item.snippetStartSec ?? null
  const resolvedEnd = snippetEnd ?? item.snippetEndSec ?? null
  const songAtmosphere = useSongAtmosphere(resolvedSongId)

  const previewRow = useMemo<PromoteQueueRow>(() => ({
    ...item,
    overrideThemeId: themeId,
    overrideAtmosphereId: atmosphereId,
    overrideShapeId: shapeId,
  }), [item, themeId, atmosphereId, shapeId])

  const previewMoment = useMemo(
    () => buildPromoteQueueMoment(previewRow, {
      songId: resolvedSongId,
      audioUrl,
      snippetStart: resolvedStart,
      snippetEnd: resolvedEnd,
    }),
    [previewRow, resolvedSongId, audioUrl, resolvedStart, resolvedEnd],
  )

  const listen = useMemo(() => resolveMomentListen(previewMoment), [previewMoment])
  const canPlayInline = !!audioUrl && resolvedStart != null && resolvedEnd != null
  const playbackSongId = resolvedSongId || item.id
  const { playing, buffering } = useSnippetPlaybackUi(
    canPlayInline ? playbackSongId : null,
    canPlayInline ? item.lyricText : null,
  )

  const startPreviewPlayback = useCallback(() => {
    if (!canPlayInline || !audioUrl || resolvedStart == null || resolvedEnd == null) return
    void playSnippet({
      songId: playbackSongId,
      audioUrl,
      title: item.songTitle,
      artist: item.artistName,
      artwork: item.artworkUrl,
      lineIndex: resolvedStart,
      lineText: item.lyricText,
      startSec: resolvedStart,
      endSec: resolvedEnd,
      atmosphere: livingAtmosphereOrNull(atmosphereId !== 'still' ? atmosphereId : songAtmosphere),
      source: 'feed',
    })
  }, [
    canPlayInline,
    audioUrl,
    playbackSongId,
    resolvedStart,
    resolvedEnd,
    item.songTitle,
    item.artistName,
    item.artworkUrl,
    item.lyricText,
    atmosphereId,
    songAtmosphere,
  ])

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
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(typeof body.error === 'string' ? body.error : 'Could not save changes')
    }
  }, [item.id, themeId, atmosphereId, shapeId])

  useEffect(() => {
    if (item.status !== 'pending_review' && item.status !== 'approved') return
    const timer = window.setTimeout(() => {
      void saveOverrides().catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not save changes')
      })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [item.status, saveOverrides])

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
  const canEdit = item.status === 'pending_review' || item.status === 'approved'
  const canPublish = item.status === 'approved' || item.status === 'partial'
  const canApprove = item.status === 'pending_review'

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
        <MomentExportPreviewFrame shapeId={shapeId}>
          <StageMomentCard
            lyric={previewMoment.lines[0]?.lyric || ''}
            songTitle={previewMoment.lines[0]?.songTitle || ''}
            artistName={previewMoment.lines[0]?.artistName || ''}
            artwork={previewMoment.lines[0]?.artworkUrl}
            vibeLabel={previewMoment.vibeLabel}
            cardThemeId={themeId}
            atmosphereId={atmosphereId}
            shapeId={shapeId}
            canPlay={canPlayInline}
            playing={playing}
            buffering={buffering}
            onPlay={startPreviewPlayback}
            effectOwnsFill
          />
        </MomentExportPreviewFrame>
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
        <p style={{
          fontFamily: font,
          fontSize: '0.8rem',
          color: 'var(--danger, #e55)',
          marginTop: '8px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {youtubeTarget.errorMessage}
        </p>
      )}

      {error && (
        <p style={{
          fontFamily: font,
          fontSize: '0.8rem',
          color: 'var(--danger, #e55)',
          marginTop: '8px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>{error}</p>
      )}

      {busy && (
        <p style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>{busy}</p>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
        {canApprove && (
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
        {item.status === 'approved' && (
          <button type="button" onClick={() => void reject()} disabled={!!busy} style={ghostBtn}>
            Reject
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
