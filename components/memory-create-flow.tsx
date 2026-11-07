'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { ComposeSearchDropdown, type ComposeSearchHit } from '@/components/compose-search-dropdown'
import { MargoSearchInput } from '@/components/margo-search-input'
import { KeyboardSafeCtaBar, keyboardSafePrimaryBtnStyle } from '@/components/keyboard-safe-cta-bar'
import { ArrowLeftIcon, CloseIcon } from '@/components/icons'
import { compactArtworkUrl } from '@/lib/compact-artwork-url'
import { createClient } from '@/lib/supabase/client'
import { fetchUnifiedSongSearchHits } from '@/lib/song-search/unified-song-search'
import { MARGO_SEARCH_HINT_SONGS } from '@/lib/margo-search-hints'
import { memoryDefaultTitle, validateMemoryTitle } from '@/lib/memory/title'
import { formatMemoryDatePublic } from '@/lib/memory/date-label'
import type {
  MemoryDateGranularity,
  MemoryPhotoInput,
  MemorySongInput,
  MemoryVisibility,
} from '@/lib/memory/types'
import { TYPE, UI_FONT } from '@/lib/fonts'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useKeyboardSafeChrome } from '@/hooks/useVisualViewport'
import { useInlineSearchDropdownMaxHeight } from '@/hooks/useInlineSearchDropdownMaxHeight'
import { toast } from 'sonner'

const font = UI_FONT
const supabase = createClient()
const MAX_SONGS = 30
const MAX_MEDIA = 10
const MAX_VIDEO_SEC = 60
const STORY_MAX = 500

type DraftSong = {
  id: string
  songId: string | null
  songTitle: string
  artistName: string
  artwork: string
  isLyricOnly: boolean
}

type DraftPhoto = {
  position: number
  r2Key: string
  previewUrl: string
  width: number
  height: number
  mediaType: 'image' | 'video'
  durationSec?: number
}

type Step = 1 | 2 | 3 | 4

const btnSecondary: CSSProperties = {
  flex: 1,
  minHeight: 'var(--margo-touch-min)',
  borderRadius: '999px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
  fontFamily: font,
  fontSize: TYPE.label,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
}

function monthStartIso(y: number, m: number): string {
  const mm = String(m).padStart(2, '0')
  return `${y}-${mm}-01`
}

async function encodeImageWebp(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file)
  const maxEdge = 1600
  let w = bitmap.width
  let h = bitmap.height
  if (w > maxEdge || h > maxEdge) {
    const scale = maxEdge / Math.max(w, h)
    w = Math.round(w * scale)
    h = Math.round(h * scale)
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process image')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), 'image/webp', 0.86)
  })
  return { blob, width: w, height: h }
}

async function readVideoMeta(file: File): Promise<{ durationSec: number; width: number; height: number }> {
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.src = url
      v.onloadedmetadata = () => {
        if (!Number.isFinite(v.duration) || v.duration > MAX_VIDEO_SEC + 0.25) {
          reject(new Error(`Video must be ${MAX_VIDEO_SEC} seconds or shorter`))
          return
        }
        resolve({ durationSec: v.duration, width: v.videoWidth, height: v.videoHeight })
      }
      v.onerror = () => reject(new Error('Could not read video'))
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function captureVideoPoster(
  file: File,
): Promise<{ blob: Blob; width: number; height: number }> {
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const v = document.createElement('video')
      v.preload = 'auto'
      v.muted = true
      v.playsInline = true
      v.src = url
      v.onloadeddata = () => {
        v.currentTime = Math.min(0.12, v.duration * 0.08)
      }
      v.onseeked = () => {
        const w = v.videoWidth
        const h = v.videoHeight
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not capture poster'))
          return
        }
        ctx.drawImage(v, 0, 0, w, h)
        canvas.toBlob(
          (b) => (b ? resolve({ blob: b, width: w, height: h }) : reject(new Error('Could not encode poster'))),
          'image/webp',
          0.86,
        )
      }
      v.onerror = () => reject(new Error('Could not load video for poster'))
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function putToPresignedUrl(
  presign: { url: string; headers: Record<string, string> },
  body: Blob,
): Promise<void> {
  const res = await fetch(presign.url, { method: 'PUT', headers: presign.headers, body })
  if (!res.ok) throw new Error('Upload failed')
}

export function MemoryCreateFlow({ onClose }: { onClose?: () => void }) {
  const router = useRouter()
  const { requireAuth } = useAuthGate()
  const { keyboardOpen } = useKeyboardSafeChrome()
  const [step, setStep] = useState<Step>(1)
  const [desktop, setDesktop] = useState(false)
  const draftId = useRef(crypto.randomUUID())

  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<ComposeSearchHit[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchGen = useRef(0)
  const songSearchWrapRef = useRef<HTMLDivElement | null>(null)
  const songSearchOpen = showResults && query.trim().length >= 2
  const songListMaxH = useInlineSearchDropdownMaxHeight(songSearchWrapRef, songSearchOpen)

  const [songs, setSongs] = useState<DraftSong[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const [story, setStory] = useState('')
  const [title, setTitle] = useState('')
  const [photos, setPhotos] = useState<DraftPhoto[]>([])
  const [photoUploading, setPhotoUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)

  const [dateGranularity, setDateGranularity] = useState<MemoryDateGranularity>('none')
  const [showDatePublicly, setShowDatePublicly] = useState(true)
  const [mood, setMood] = useState('')
  const [dayValue, setDayValue] = useState('')
  const [monthValue, setMonthValue] = useState('')
  const [yearValue, setYearValue] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')

  const [visibility, setVisibility] = useState<MemoryVisibility>('public')
  const [showInLyricsFeed, setShowInLyricsFeed] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 835px)')
    const apply = () => setDesktop(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      setSearchLoading(false)
      setShowResults(false)
      return
    }
    const gen = ++searchGen.current
    setSearchLoading(true)
    setShowResults(true)
    const t = window.setTimeout(() => {
      void fetchUnifiedSongSearchHits(supabase, q, 10)
        .then((rows) => {
          if (gen !== searchGen.current) return
          setHits(rows)
          setSearchLoading(false)
        })
        .catch(() => {
          if (gen !== searchGen.current) return
          setHits([])
          setSearchLoading(false)
        })
    }, 220)
    return () => window.clearTimeout(t)
  }, [query])

  const reorderSongs = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= songs.length || to >= songs.length) return
    const next = [...songs]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setSongs(next)
  }

  const addSong = (hit: ComposeSearchHit) => {
    if (songs.length >= MAX_SONGS) return
    const onMargo = hit.source === 'margo' && hit.margoSongId
    setSongs((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        songId: onMargo ? hit.margoSongId! : null,
        songTitle: hit.title,
        artistName: hit.artist,
        artwork: hit.artwork || '',
        isLyricOnly: !onMargo,
      },
    ])
    setQuery('')
    setHits([])
    setShowResults(false)
  }

  const removeSong = (index: number) => {
    setSongs((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadPhoto = async (file: File) => {
    if (photos.length >= MAX_MEDIA || photoUploading) return
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm)$/i.test(file.name)
    setPhotoUploading(true)
    setUploadStatus(isVideo ? 'Processing video…' : 'Processing photo…')
    try {
      const position = photos.length
      if (isVideo) {
        if (file.size > 50 * 1024 * 1024) throw new Error('Video must be under 50 MB')
        if (!['video/mp4', 'video/webm'].includes(file.type) && !/\.(mp4|webm)$/i.test(file.name)) {
          throw new Error('Use mp4 or webm video')
        }
        const contentType = file.type || (file.name.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4')
        const { durationSec, width, height } = await readVideoMeta(file)
        setUploadStatus('Uploading poster…')
        const poster = await captureVideoPoster(file)
        const posterPresignRes = await fetch('/api/memories/photo-upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draftId: draftId.current,
            position,
            contentType: 'image/webp',
            byteLength: poster.blob.size,
            kind: 'poster',
          }),
        })
        if (!posterPresignRes.ok) {
          const err = await posterPresignRes.json().catch(() => ({}))
          throw new Error((err as { error?: string }).error || 'Poster upload failed')
        }
        const posterPresign = (await posterPresignRes.json()) as {
          url: string
          headers: Record<string, string>
          key: string
          publicUrl: string
        }
        await putToPresignedUrl(posterPresign, poster.blob)

        setUploadStatus('Uploading video…')
        const videoPresignRes = await fetch('/api/memories/photo-upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draftId: draftId.current,
            position,
            contentType,
            byteLength: file.size,
            kind: 'video',
          }),
        })
        if (!videoPresignRes.ok) {
          const err = await videoPresignRes.json().catch(() => ({}))
          throw new Error((err as { error?: string }).error || 'Video upload failed')
        }
        const videoPresign = (await videoPresignRes.json()) as {
          url: string
          headers: Record<string, string>
          key: string
          publicUrl: string
        }
        await putToPresignedUrl(videoPresign, file)
        setPhotos((prev) => [
          ...prev,
          {
            position,
            r2Key: videoPresign.key,
            previewUrl: posterPresign.publicUrl,
            width,
            height,
            mediaType: 'video',
            durationSec,
          },
        ])
      } else {
        const { blob, width, height } = await encodeImageWebp(file)
        setUploadStatus('Uploading photo…')
        const presignRes = await fetch('/api/memories/photo-upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draftId: draftId.current,
            position,
            contentType: 'image/webp',
            byteLength: blob.size,
            kind: 'image',
          }),
        })
        if (!presignRes.ok) {
          const err = await presignRes.json().catch(() => ({}))
          throw new Error((err as { error?: string }).error || 'Upload failed')
        }
        const presign = (await presignRes.json()) as {
          url: string
          headers: Record<string, string>
          key: string
          publicUrl: string
        }
        await putToPresignedUrl(presign, blob)
        setPhotos((prev) => [
          ...prev,
          {
            position,
            r2Key: presign.key,
            previewUrl: presign.publicUrl,
            width,
            height,
            mediaType: 'image',
          },
        ])
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add media')
    } finally {
      setPhotoUploading(false)
      setUploadStatus(null)
    }
  }

  const buildDatePayload = (): { dateStart: string | null; dateEnd: string | null } => {
    if (dateGranularity === 'none') return { dateStart: null, dateEnd: null }
    if (dateGranularity === 'day') {
      return { dateStart: dayValue || null, dateEnd: null }
    }
    if (dateGranularity === 'month' && monthValue) {
      const [y, m] = monthValue.split('-').map(Number)
      if (y && m) return { dateStart: monthStartIso(y, m), dateEnd: null }
    }
    if (dateGranularity === 'year' && yearValue) {
      return { dateStart: `${yearValue.trim()}-01-01`, dateEnd: null }
    }
    if (dateGranularity === 'period' && periodStart) {
      const [sy, sm] = periodStart.split('-').map(Number)
      const start = sy && sm ? monthStartIso(sy, sm) : null
      let end: string | null = null
      if (periodEnd) {
        const [ey, em] = periodEnd.split('-').map(Number)
        if (ey && em) end = monthStartIso(ey, em)
      }
      return { dateStart: start, dateEnd: end }
    }
    return { dateStart: null, dateEnd: null }
  }

  const previewDate = useMemo(() => {
    const { dateStart, dateEnd } = buildDatePayload()
    return formatMemoryDatePublic({
      granularity: dateGranularity,
      dateStart,
      dateEnd,
      showDatePublicly,
    })
  }, [
    dateGranularity,
    dayValue,
    monthValue,
    yearValue,
    periodStart,
    periodEnd,
    showDatePublicly,
  ])

  const canAdvanceStep1 = songs.length >= 1
  const titleErr = validateMemoryTitle(title, songs.length)
  const canAdvanceStep2 = story.trim().length > 0 && !titleErr

  const goNext = () => {
    if (step === 1 && !canAdvanceStep1) return
    if (step === 2 && !canAdvanceStep2) return
    setStep((s) => Math.min(4, s + 1) as Step)
  }

  const goBack = () => {
    if (step === 1) {
      onClose?.()
      return
    }
    setStep((s) => Math.max(1, s - 1) as Step)
  }

  const submit = async () => {
    if (!requireAuth()) return
    if (submitting || songs.length < 1) return
    const err = validateMemoryTitle(title, songs.length)
    if (err) {
      toast.error(err)
      return
    }
    setSubmitting(true)
    try {
      const { dateStart, dateEnd } = buildDatePayload()
      const songPayload: MemorySongInput[] = songs.map((s, i) => ({
        position: i,
        songId: s.songId,
        songTitle: s.songTitle,
        artistName: s.artistName,
        isLyricOnly: s.isLyricOnly,
      }))
      const photoPayload: MemoryPhotoInput[] = photos.map((p, i) => ({
        position: i,
        r2Key: p.r2Key,
        width: p.width,
        height: p.height,
      }))
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || memoryDefaultTitle(songs.length),
          story: story.trim(),
          mood: mood.trim() || null,
          visibility,
          showInLyricsFeed,
          showDatePublicly,
          dateGranularity,
          dateStart,
          dateEnd,
          songs: songPayload,
          photos: photoPayload,
          coverR2Key: photoPayload[0]?.r2Key ?? null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Could not create memory')
      }
      const id = (data as { memory?: { id: string } }).memory?.id
      if (!id) throw new Error('Could not create memory')
      router.replace(`/memory/${id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create memory')
    } finally {
      setSubmitting(false)
    }
  }

  const panelClass = desktop
    ? 'margo-memory-create margo-memory-create--desktop'
    : 'margo-memory-create'

  const inputStyle: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 'var(--margo-touch-min)',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    background: 'var(--surface-2)',
    color: 'var(--text)',
    fontFamily: font,
    fontSize: TYPE.secondary,
    padding: '12px 14px',
    outline: 'none',
  }

  const labelStyle: CSSProperties = {
    display: 'block',
    fontFamily: font,
    fontSize: TYPE.label,
    color: 'var(--text-muted)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '8px',
  }

  return (
    <div
      className={panelClass}
      style={{
        minHeight: desktop ? undefined : '100dvh',
        background: 'var(--bg)',
        paddingBottom: 'var(--margo-page-padding-bottom)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: 'calc(var(--nav-height, 72px) + 12px) 20px 16px',
        }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={goBack}
          style={{
            width: 'var(--margo-touch-min)',
            height: 'var(--margo-touch-min)',
            borderRadius: '50%',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <ArrowLeftIcon size={18} color="var(--text)" />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontFamily: font, fontSize: TYPE.label, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            New memory
          </p>
          <p style={{ margin: '4px 0 0', fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-muted)' }}>
            Step {step} of 4
          </p>
        </div>
      </header>

      <div style={{ padding: '0 20px 120px', maxWidth: 560, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {step === 1 ? (
          <>
            <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
              Add up to {MAX_SONGS} songs. Drag to reorder.
            </p>
            <div
              ref={songSearchWrapRef}
              style={{ position: 'relative', zIndex: songSearchOpen ? 60 : 1 }}
            >
              <MargoSearchInput
                value={query}
                onChange={setQuery}
                hintText={MARGO_SEARCH_HINT_SONGS}
                ariaLabel="Search songs"
                loading={searchLoading}
                stackAboveOverlay={songSearchOpen}
              />
              <ComposeSearchDropdown
                open={songSearchOpen}
                loading={searchLoading}
                results={hits}
                highlightQuery={query}
                onSelect={addSong}
                onClose={() => setShowResults(false)}
                variant="compose"
                listMaxHeightPx={songListMaxH ?? undefined}
              />
            </div>
            {songs.length > 0 ? (
              <ul style={{ listStyle: 'none', margin: '20px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {songs.map((s, index) => (
                  <li
                    key={s.id}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex !== null) reorderSongs(dragIndex, index)
                      setDragIndex(null)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      cursor: 'grab',
                    }}
                  >
                    <span style={{ fontFamily: font, fontSize: TYPE.meta, color: 'var(--text-muted)', width: 20 }}>{index + 1}</span>
                    {s.artwork ? (
                      <img
                        src={compactArtworkUrl(s.artwork, 80)}
                        alt=""
                        width={44}
                        height={44}
                        style={{ borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <span style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--surface-2)', flexShrink: 0 }} />
                    )}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.songTitle}
                      </span>
                      <span style={{ display: 'block', fontFamily: font, fontSize: TYPE.meta, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.artistName}
                        {s.isLyricOnly ? ' · Lyric only' : ''}
                      </span>
                    </span>
                    {!s.isLyricOnly ? (
                      <span className="margo-memory-create__on-margo" style={{ fontFamily: font, fontSize: TYPE.label, color: 'var(--gold)', letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>
                        On Margo
                      </span>
                    ) : null}
                    <button
                      type="button"
                      aria-label="Remove song"
                      onClick={() => removeSong(index)}
                      style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', minWidth: 'var(--margo-touch-min)', minHeight: 'var(--margo-touch-min)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <CloseIcon size={14} color="var(--text-secondary)" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <label style={labelStyle}>What does this mean to you?</label>
            <textarea
              value={story}
              onChange={(e) => setStory(e.target.value.slice(0, STORY_MAX))}
              rows={5}
              placeholder="Your story"
              style={{ ...inputStyle, resize: 'vertical', minHeight: 120, lineHeight: 1.45 }}
            />
            <p style={{ fontFamily: font, fontSize: TYPE.meta, color: 'var(--text-muted)', margin: '6px 0 20px', textAlign: 'right' }}>
              {story.length}/{STORY_MAX}
            </p>
            <label style={labelStyle}>
              Title{songs.length >= 2 ? ' (required)' : ' (optional)'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 120))}
              placeholder={memoryDefaultTitle(songs.length)}
              style={inputStyle}
            />
            {titleErr ? (
              <p style={{ fontFamily: font, fontSize: TYPE.meta, color: 'var(--danger, #e57373)', margin: '6px 0 0' }}>{titleErr}</p>
            ) : null}
            <div style={{ marginTop: 24 }}>
              <label style={labelStyle}>Photos &amp; videos ({photos.length}/{MAX_MEDIA})</label>
              {uploadStatus ? (
                <p style={{ fontFamily: font, fontSize: TYPE.meta, color: 'var(--text-muted)', margin: '4px 0 8px' }}>
                  {uploadStatus}
                </p>
              ) : null}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {photos.map((p) => (
                  <div key={p.r2Key} style={{ position: 'relative', width: 72, height: 72, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img src={p.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {p.mediaType === 'video' ? (
                      <span style={{ position: 'absolute', left: 4, bottom: 4, fontSize: 10, padding: '2px 4px', borderRadius: 4, background: 'rgba(0,0,0,0.6)', color: '#fff' }}>Video</span>
                    ) : null}
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() => setPhotos((prev) => prev.filter((x) => x.r2Key !== p.r2Key))}
                      style={{ position: 'absolute', top: 2, right: 2, width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.55)', color: '#fff', cursor: 'pointer' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {photos.length < MAX_MEDIA ? (
                  <label
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 10,
                      border: '1px dashed var(--border)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: font,
                      fontSize: TYPE.meta,
                      color: 'var(--text-muted)',
                      cursor: photoUploading ? 'wait' : 'pointer',
                    }}
                  >
                    {photoUploading ? '…' : '+'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                      hidden
                      disabled={photoUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        e.target.value = ''
                        if (f) void uploadPhoto(f)
                      }}
                    />
                  </label>
                ) : null}
              </div>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <label style={labelStyle}>When</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {(['day', 'month', 'year', 'period', 'none'] as MemoryDateGranularity[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setDateGranularity(g)}
                  style={{
                    minHeight: 'var(--margo-touch-min)',
                    padding: '0 14px',
                    borderRadius: 999,
                    border: `1px solid ${dateGranularity === g ? 'var(--gold)' : 'var(--border)'}`,
                    background: dateGranularity === g ? 'var(--gold-faint)' : 'var(--surface)',
                    color: dateGranularity === g ? 'var(--gold)' : 'var(--text-secondary)',
                    fontFamily: font,
                    fontSize: TYPE.label,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
            {dateGranularity === 'day' ? (
              <input type="date" value={dayValue} onChange={(e) => setDayValue(e.target.value)} style={inputStyle} />
            ) : null}
            {dateGranularity === 'month' ? (
              <input type="month" value={monthValue} onChange={(e) => setMonthValue(e.target.value)} style={inputStyle} />
            ) : null}
            {dateGranularity === 'year' ? (
              <input
                type="number"
                min={1900}
                max={2100}
                value={yearValue}
                onChange={(e) => setYearValue(e.target.value)}
                placeholder="Year"
                style={inputStyle}
              />
            ) : null}
            {dateGranularity === 'period' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="month" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} aria-label="Period start" style={inputStyle} />
                <input type="month" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} aria-label="Period end (optional)" style={inputStyle} />
              </div>
            ) : null}
            <label style={{ ...labelStyle, marginTop: 20, display: 'flex', alignItems: 'center', gap: 10, textTransform: 'none', letterSpacing: 0 }}>
              <input type="checkbox" checked={showDatePublicly} onChange={(e) => setShowDatePublicly(e.target.checked)} />
              <span style={{ fontSize: TYPE.secondary, color: 'var(--text)' }}>Show date publicly</span>
            </label>
            <label style={{ ...labelStyle, marginTop: 20 }}>Mood</label>
            <input
              type="text"
              value={mood}
              onChange={(e) => setMood(e.target.value.slice(0, 40))}
              placeholder="Optional"
              style={inputStyle}
            />
          </>
        ) : null}

        {step === 4 ? (
          <>
            <div style={{ borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)', padding: 16, marginBottom: 20 }}>
              {photos[0] ? (
                <div style={{ width: '100%', aspectRatio: '16/10', borderRadius: 12, background: `center/cover no-repeat url(${photos[0].previewUrl})`, marginBottom: 12 }} />
              ) : songs[0]?.artwork ? (
                <div style={{ width: '100%', aspectRatio: '16/10', borderRadius: 12, background: `center/cover no-repeat url(${compactArtworkUrl(songs[0].artwork, 400)})`, marginBottom: 12 }} />
              ) : null}
              <h2 style={{ margin: '0 0 8px', fontFamily: font, fontSize: TYPE.body, fontWeight: 600, color: 'var(--text)' }}>
                {title.trim() || memoryDefaultTitle(songs.length)}
              </h2>
              {previewDate ? (
                <p style={{ margin: '0 0 8px', fontFamily: font, fontSize: TYPE.meta, color: 'var(--gold)' }}>{previewDate}</p>
              ) : null}
              {mood.trim() ? (
                <p style={{ margin: '0 0 8px', fontFamily: font, fontSize: TYPE.meta, color: 'var(--text-muted)' }}>{mood.trim()}</p>
              ) : null}
              <p style={{ margin: 0, fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                {story.trim()}
              </p>
              <p style={{ margin: '12px 0 0', fontFamily: font, fontSize: TYPE.meta, color: 'var(--text-muted)' }}>
                {songs.length} song{songs.length === 1 ? '' : 's'}
              </p>
            </div>
            <label style={labelStyle}>Who can see this?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {([
                ['public', 'Everyone'],
                ['followers', 'Followers'],
                ['only_me', 'Only me'],
              ] as const).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  style={{
                    minHeight: 'var(--margo-touch-min)',
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: `1px solid ${visibility === v ? 'var(--gold)' : 'var(--border)'}`,
                    background: visibility === v ? 'var(--gold-faint)' : 'var(--surface)',
                    color: 'var(--text)',
                    fontFamily: font,
                    fontSize: TYPE.secondary,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 10, textTransform: 'none', letterSpacing: 0 }}>
              <input type="checkbox" checked={showInLyricsFeed} onChange={(e) => setShowInLyricsFeed(e.target.checked)} />
              <span style={{ fontSize: TYPE.secondary }}>Show in lyrics feed</span>
            </label>
          </>
        ) : null}
      </div>

      <KeyboardSafeCtaBar keyboardOpen={keyboardOpen} contentMaxWidth={560}>
        <div style={{ display: 'flex', gap: 10, padding: '0 4px' }}>
          {step < 4 ? (
            <>
              <button type="button" style={btnSecondary} onClick={goBack}>
                {step === 1 ? 'Close' : 'Back'}
              </button>
              <button
                type="button"
                style={{
                  ...keyboardSafePrimaryBtnStyle,
                  flex: 1,
                  opacity: (step === 1 && !canAdvanceStep1) || (step === 2 && !canAdvanceStep2) ? 0.45 : 1,
                }}
                disabled={(step === 1 && !canAdvanceStep1) || (step === 2 && !canAdvanceStep2)}
                onClick={goNext}
              >
                Continue
              </button>
            </>
          ) : (
            <button
              type="button"
              style={{ ...keyboardSafePrimaryBtnStyle, width: '100%' }}
              disabled={submitting}
              onClick={() => void submit()}
            >
              {submitting ? 'Posting…' : 'Post memory'}
            </button>
          )}
        </div>
      </KeyboardSafeCtaBar>
    </div>
  )
}
