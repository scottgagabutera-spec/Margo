'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { StageMomentCard } from '@/components/stage/stage-moment-card'
import { MomentExportCustomizeBar } from '@/components/moment-export-customize-bar'
import { MomentExportPreviewFrame } from '@/components/moment-export-preview-frame'
import { UI_FONT } from '@/lib/fonts'
import { playSnippet } from '@/lib/audio-engine'
import { useSnippetPlaybackUi } from '@/hooks/useAudioEngine'
import { useSongAtmosphere } from '@/hooks/useSongAtmosphere'
import { livingAtmosphereOrNull } from '@/lib/atmosphere'
import { buildPromoteQueueMoment } from '@/lib/promote/build-queue-moment'
import { publishQueueMomentVideo } from '@/lib/promote/publish-client'
import { clearMomentVideoCache } from '@/lib/moment-export/video/moment-video-cache'
import type { PromoteQueueRow } from '@/lib/promote/types'
import type { AtmosphereId } from '@/lib/atmosphere'
import type { MomentShapeId } from '@/lib/moment/types'
import type { StageCardThemeId } from '@/lib/moment/stage-theme'

const font = UI_FONT

function asStageTheme(id: string | null | undefined): StageCardThemeId {
  if (id === 'blush' || id === 'sage' || id === 'dusk' || id === 'gold') return id
  return 'gold'
}

export interface PromoteQueueUpdateOptions {
  silent?: boolean
}

interface PromoteQueueCardProps {
  item: PromoteQueueRow
  audioUrl?: string | null
  songId?: string | null
  snippetStart?: number | null
  snippetEnd?: number | null
  onUpdated: (options?: PromoteQueueUpdateOptions) => void | Promise<void>
  onPublishAbortRegister?: (abort: () => void) => () => void
}

export function PromoteQueueCard({
  item,
  audioUrl,
  songId,
  snippetStart,
  snippetEnd,
  onUpdated,
  onPublishAbortRegister,
}: PromoteQueueCardProps) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmPublish, setConfirmPublish] = useState(false)
  const [publishResult, setPublishResult] = useState<{ videoUrl: string; videoId: string } | null>(null)
  const [localStatus, setLocalStatus] = useState(item.status)
  const [themeId, setThemeId] = useState<StageCardThemeId>(
    asStageTheme(item.overrideThemeId ?? item.defaultThemeId),
  )
  const [atmosphereId, setAtmosphereId] = useState<AtmosphereId>(
    item.overrideAtmosphereId ?? item.defaultAtmosphereId,
  )
  const [shapeId] = useState<MomentShapeId>(item.overrideShapeId ?? item.defaultShapeId)

  const publishInFlightRef = useRef(false)
  const actionLockRef = useRef(false)
  const publishAbortRef = useRef<AbortController | null>(null)
  const prefsRef = useRef({ themeId, atmosphereId, shapeId })

  const resolvedSongId = songId ?? item.sourceSongId ?? null
  const resolvedStart = snippetStart ?? item.snippetStartSec ?? null
  const resolvedEnd = snippetEnd ?? item.snippetEndSec ?? null
  const songAtmosphere = useSongAtmosphere(resolvedSongId)

  useEffect(() => {
    prefsRef.current = { themeId, atmosphereId, shapeId }
  }, [themeId, atmosphereId, shapeId])

  useEffect(() => {
    setThemeId(asStageTheme(item.overrideThemeId ?? item.defaultThemeId))
    setAtmosphereId(item.overrideAtmosphereId ?? item.defaultAtmosphereId)
    setConfirmPublish(false)
    setError(null)
    setPublishResult(null)
    setLocalStatus(item.status)
  }, [item.id])

  useEffect(() => {
    if (publishInFlightRef.current) return
    if (publishResult && item.status !== 'published') return
    setLocalStatus((prev) => {
      if (prev === 'approved' && item.status === 'pending_review') return prev
      if (prev === 'published' && item.status !== 'published') return prev
      return item.status
    })
  }, [item.status, publishResult])

  useEffect(() => {
    if (item.status !== 'published') return
    const youtube = item.targets.find((t) => t.platform === 'youtube')
    if (youtube?.externalPostUrl && youtube.externalPostId) {
      setPublishResult({ videoUrl: youtube.externalPostUrl, videoId: youtube.externalPostId })
    }
  }, [item.status, item.targets])

  const buildPreviewRow = useCallback((
    prefs: { themeId: StageCardThemeId; atmosphereId: AtmosphereId; shapeId: MomentShapeId },
  ): PromoteQueueRow => ({
    ...item,
    overrideThemeId: prefs.themeId,
    overrideAtmosphereId: prefs.atmosphereId,
    overrideShapeId: prefs.shapeId,
  }), [item])

  const previewRow = useMemo(
    () => buildPreviewRow({ themeId, atmosphereId, shapeId }),
    [buildPreviewRow, themeId, atmosphereId, shapeId],
  )

  const previewMoment = useMemo(
    () => buildPromoteQueueMoment(previewRow, {
      songId: resolvedSongId,
      audioUrl,
      snippetStart: resolvedStart,
      snippetEnd: resolvedEnd,
    }),
    [previewRow, resolvedSongId, audioUrl, resolvedStart, resolvedEnd],
  )

  const buildMomentForPublish = useCallback(() => {
    const prefs = prefsRef.current
    return buildPromoteQueueMoment(buildPreviewRow(prefs), {
      songId: resolvedSongId,
      audioUrl,
      snippetStart: resolvedStart,
      snippetEnd: resolvedEnd,
    })
  }, [buildPreviewRow, resolvedSongId, audioUrl, resolvedStart, resolvedEnd])

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
    const prefs = prefsRef.current
    const res = await fetch(`/api/promote/queue/${item.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        overrideThemeId: prefs.themeId,
        overrideAtmosphereId: prefs.atmosphereId,
        overrideShapeId: prefs.shapeId,
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(typeof body.error === 'string' ? body.error : 'Could not save changes')
    }
  }, [item.id])

  useEffect(() => {
    if (item.status !== 'pending_review' && item.status !== 'approved') return
    const timer = window.setTimeout(() => {
      void saveOverrides().catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not save changes')
      })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [item.status, themeId, atmosphereId, shapeId, saveOverrides])

  const cancelPublish = useCallback(() => {
    publishAbortRef.current?.abort()
    publishAbortRef.current = null
    publishInFlightRef.current = false
    setConfirmPublish(false)
    setBusy(null)
  }, [])

  useEffect(() => {
    if (!onPublishAbortRegister) return undefined
    return onPublishAbortRegister(cancelPublish)
  }, [onPublishAbortRegister, cancelPublish])

  useEffect(() => () => {
    publishAbortRef.current?.abort()
  }, [])

  const runPublish = useCallback(async () => {
    if (publishInFlightRef.current) return
    publishInFlightRef.current = true
    publishAbortRef.current?.abort()
    const ac = new AbortController()
    publishAbortRef.current = ac

    setBusy('Saving your choices…')
    setError(null)
    setConfirmPublish(false)

    setLocalStatus('publishing')
    try {
      await saveOverrides()
      if (ac.signal.aborted) throw new DOMException('Publish cancelled', 'AbortError')

      clearMomentVideoCache()
      const moment = buildMomentForPublish()

      setBusy('Rendering and uploading to YouTube…')
      const result = await publishQueueMomentVideo(
        item.id,
        moment,
        (msg) => setBusy(msg),
        ac.signal,
      )
      setPublishResult(result)
      setLocalStatus('published')
      setBusy(null)
      await onUpdated({ silent: true })
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        setError(null)
        setBusy(null)
        setLocalStatus('approved')
        return
      }
      setError(err instanceof Error ? err.message : 'Publish failed')
      setLocalStatus('approved')
      setBusy(null)
    } finally {
      publishInFlightRef.current = false
      if (publishAbortRef.current === ac) publishAbortRef.current = null
    }
  }, [item.id, saveOverrides, buildMomentForPublish, onUpdated])

  async function approve() {
    if (actionLockRef.current || publishInFlightRef.current || busy) return
    actionLockRef.current = true
    setBusy('Approving…')
    setError(null)
    setLocalStatus('approved')
    try {
      await saveOverrides()
      const res = await fetch(`/api/promote/queue/${item.id}/approve`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Approve failed')
      actionLockRef.current = false
      setBusy(null)
      await onUpdated({ silent: true })
    } catch (err) {
      actionLockRef.current = false
      if ((err as Error)?.name === 'AbortError') {
        setBusy(null)
        return
      }
      setError(err instanceof Error ? err.message : 'Approve failed')
      setLocalStatus(item.status)
      setBusy(null)
    }
  }

  async function reject() {
    if (actionLockRef.current || publishInFlightRef.current || busy) return
    actionLockRef.current = true
    cancelPublish()
    setBusy('Rejecting…')
    await fetch(`/api/promote/queue/${item.id}/reject`, { method: 'POST', credentials: 'include' })
    actionLockRef.current = false
    setBusy(null)
    void onUpdated({ silent: true })
  }

  function requestPublish() {
    if (actionLockRef.current || publishInFlightRef.current || busy) return
    setError(null)
    setConfirmPublish(true)
  }

  const youtubeTarget = item.targets.find((t) => t.platform === 'youtube')
  const publishedUrl = publishResult?.videoUrl ?? youtubeTarget?.externalPostUrl ?? null
  const status = publishResult ? 'published' : localStatus
  const canEdit = (status === 'pending_review' || status === 'approved') && !busy
  const canPublish = status === 'approved' || status === 'partial'
  const canApprove = status === 'pending_review'
  const isPublished = status === 'published'
  const isPublishing = status === 'publishing' || !!busy
  const actionsLocked = !!busy || isPublishing || isPublished

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
        {isPublished ? 'published' : status.replace('_', ' ')}
      </div>
      <div style={{ fontFamily: font, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
        {item.songTitle}
      </div>
      <div style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', whiteSpace: 'pre-line' }}>
        {item.lyricText}
      </div>

      {previewMoment.vibeLabel && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{
            fontFamily: font,
            fontSize: '0.56rem',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}>
            Mood
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: '22px',
            padding: '0 10px',
            borderRadius: '50px',
            border: '1px solid var(--gold-border)',
            background: 'var(--gold-faint)',
            fontFamily: font,
            fontSize: '0.56rem',
            fontWeight: 700,
            letterSpacing: '0.4px',
            textTransform: 'uppercase',
            color: 'var(--gold)',
          }}>
            {previewMoment.vibeLabel}
          </span>
        </div>
      )}

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
          onThemeChange={setThemeId}
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

      {isPublished && publishedUrl && (
        <div style={{
          marginTop: '12px',
          padding: '14px 16px',
          borderRadius: '12px',
          border: '1px solid var(--gold-border)',
          background: 'var(--gold-faint)',
        }}>
          <p style={{
            fontFamily: font,
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: '0 0 8px',
          }}>
            Published to YouTube
          </p>
          <a
            href={publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: font, color: 'var(--gold)', fontSize: '0.85rem' }}
          >
            View Short on YouTube →
          </a>
        </div>
      )}

      {youtubeTarget?.errorMessage && !isPublished && (
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

      {confirmPublish && (
        <div style={{
          marginTop: '16px',
          padding: '14px 16px',
          borderRadius: '12px',
          border: '1px solid var(--border-hi)',
          background: 'var(--surface-2)',
        }}>
          <p style={{
            fontFamily: font,
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
            margin: '0 0 12px',
            lineHeight: 1.45,
          }}>
            Are you sure you chose the right color and the right effect? This publishes to YouTube now and cannot be undone from Margo.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => void runPublish()}
              disabled={!!busy || shapeId !== 'vertical'}
              style={primaryBtn}
            >
              Confirm publish
            </button>
            <button
              type="button"
              onClick={cancelPublish}
              disabled={!!busy}
              style={ghostBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!confirmPublish && !isPublished && !isPublishing && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
          {canApprove && (
            <>
              <button
                type="button"
                onClick={() => void approve()}
                disabled={actionsLocked || shapeId !== 'vertical'}
                style={primaryBtn}
              >
                Approve
              </button>
              <button type="button" onClick={() => void reject()} disabled={actionsLocked} style={ghostBtn}>
                Reject
              </button>
            </>
          )}
          {canPublish && shapeId === 'vertical' && (
            <>
              <button
                type="button"
                onClick={requestPublish}
                disabled={actionsLocked || publishInFlightRef.current}
                style={primaryBtn}
              >
                Publish to YouTube
              </button>
              <button type="button" onClick={() => void reject()} disabled={actionsLocked} style={ghostBtn}>
                Reject
              </button>
            </>
          )}
        </div>
      )}

      {canEdit && status === 'approved' && !confirmPublish && !isPublished && !isPublishing && (
        <p style={{
          fontFamily: font,
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          marginTop: '12px',
          lineHeight: 1.4,
        }}>
          Approved — you can still change color or effect above before publishing.
        </p>
      )}
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
