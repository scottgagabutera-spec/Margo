'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { ComposeSearchDropdown, type ComposeSearchHit } from '@/components/compose-search-dropdown'
import { MargoSearchInput } from '@/components/margo-search-input'
import { KeyboardSafeCtaBar, keyboardSafePrimaryBtnStyle } from '@/components/keyboard-safe-cta-bar'
import { CloseIcon } from '@/components/icons'
import { compactArtworkUrl } from '@/lib/compact-artwork-url'
import { createClient } from '@/lib/supabase/client'
import { fetchUnifiedSongSearchHits } from '@/lib/song-search/unified-song-search'
import { MARGO_SEARCH_HINT_SONGS } from '@/lib/margo-search-hints'
import { memoryDefaultTitle, memoryTitlePlaceholder, validateMemoryTitle } from '@/lib/memory/title'
import { hasMemoryContent } from '@/lib/memory/validate-payload'
import { MemoryImproveWithAi, MemorySuggestTitles } from '@/components/memory-ai-field-actions'
import { memoryCaptionTitle } from '@/lib/memory/display-caption'
import { ProfileMemoryTile } from '@/components/profile-memory-tile'
import type { MemoryPublic } from '@/lib/memory/types'
import { formatMemoryDatePublic } from '@/lib/memory/date-label'
import type {
  MemoryDateGranularity,
  MemoryPhotoInput,
  MemorySongInput,
  MemoryVisibility,
} from '@/lib/memory/types'
import { MemoryMediaPicker } from '@/components/memory-media-picker'
import type { MemoryDraftPhoto } from '@/lib/memory/client-media-upload'
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

type Step = 1 | 2 | 3 | 4
type MemoryEntryKind = 'song' | 'media' | 'words'

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
  const [photos, setPhotos] = useState<MemoryDraftPhoto[]>([])

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
  const [titleTouched, setTitleTouched] = useState(false)
  const [entryKind, setEntryKind] = useState<MemoryEntryKind | null>(null)

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

  const canAdvanceStep1 =
    entryKind === 'song'
      ? songs.length >= 1
      : entryKind === 'media' || entryKind === 'words'
        ? true
        : false
  const titleErr = validateMemoryTitle(title)
  const hasContent = hasMemoryContent({
    songs: songs.map((s, i) => ({
      position: i,
      songId: s.songId,
      songTitle: s.songTitle,
      artistName: s.artistName,
      isLyricOnly: s.isLyricOnly,
    })),
    photos: photos.map((p, i) => ({ position: i, r2Key: p.r2Key })),
    story,
  })
  const canAdvanceStep2 = hasContent && !titleErr

  const goNext = () => {
    if (step === 1 && !canAdvanceStep1) return
    if (step === 2) {
      setTitleTouched(true)
      if (!canAdvanceStep2) return
    }
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
    if (submitting) return
    if (!hasContent) {
      toast.error('Add at least one song, photo or video, or write your story.')
      return
    }
    const err = validateMemoryTitle(title)
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
          title: title.trim(),
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
    fontSize: TYPE.secondary,
    fontWeight: 500,
    color: 'var(--gold)',
    letterSpacing: '-0.01em',
    textTransform: 'none',
    marginBottom: '8px',
  }

  const previewMemory = useMemo((): MemoryPublic => {
    const { dateStart, dateEnd } = buildDatePayload()
    const coverFromPhoto = photos[0]?.previewUrl || null
    const coverFromSong = songs[0]?.artwork ? compactArtworkUrl(songs[0].artwork, 400) : null
    const resolvedTitle = title.trim() || memoryDefaultTitle(songs.length)
    return {
      id: 'preview',
      ownerProfileId: '',
      ownerUsername: 'you',
      ownerDisplayName: 'You',
      ownerAvatarUrl: null,
      title: resolvedTitle,
      story: story.trim() || null,
      mood: mood.trim() || null,
      visibility,
      showInLyricsFeed,
      showDatePublicly,
      dateGranularity,
      dateStart,
      dateEnd,
      coverUrl: coverFromPhoto || coverFromSong,
      songCount: songs.length,
      resonateCount: 0,
      lyricBackCount: 0,
      createdAt: new Date().toISOString(),
      songs: songs.map((s, i) => ({
        id: s.id,
        position: i,
        songId: s.songId,
        songTitle: s.songTitle,
        artistName: s.artistName,
        lyricExcerpt: null,
        isLyricOnly: s.isLyricOnly,
        artworkUrl: s.artwork || null,
        audioUrl: null,
      })),
      photos: photos.map((p, i) => ({
        id: p.r2Key,
        position: i,
        url: p.previewUrl,
        width: null,
        height: null,
        mediaType: p.mediaType,
        posterUrl: null,
        durationSec: p.durationSec ?? null,
      })),
      viewerResonated: false,
      isOwner: true,
    }
  }, [
    songs,
    story,
    title,
    photos,
    mood,
    visibility,
    showInLyricsFeed,
    showDatePublicly,
    dateGranularity,
    dayValue,
    monthValue,
    yearValue,
    periodStart,
    periodEnd,
  ])

  const previewHeading = memoryCaptionTitle(previewMemory)
  const showTitleErr = titleTouched && titleErr

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
          padding: 'calc(var(--nav-height, 72px) + 12px) 20px 16px',
        }}
      >
        <p style={{ margin: 0, fontFamily: font, fontSize: TYPE.secondary, fontWeight: 500, color: 'var(--gold)' }}>
          New memory
        </p>
        <p style={{ margin: '4px 0 0', fontFamily: font, fontSize: TYPE.meta, color: 'var(--text-muted)' }}>
          Step {step} of 4
        </p>
      </header>

      <div
        style={{
          padding: `0 20px ${step === 4 ? '200px' : '120px'}`,
          maxWidth: 560,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {step === 1 ? (
          <>
            <p style={{ ...labelStyle, marginBottom: 12 }}>What is this memory about?</p>
            <div className="margo-memory-entry-choices">
              {([
                ['song', 'A song'],
                ['media', 'A photo or video'],
                ['words', 'Just my words'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`margo-memory-entry-choices__btn${entryKind === id ? ' margo-memory-entry-choices__btn--active' : ''}`}
                  onClick={() => setEntryKind(id)}
                  style={{ fontFamily: font }}
                >
                  {label}
                </button>
              ))}
            </div>
            {entryKind === 'song' ? (
            <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)', margin: '16px 0' }}>
              Add up to {MAX_SONGS} songs. Drag to reorder.
            </p>
            ) : entryKind === 'media' ? (
              <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)', margin: '16px 0' }}>
                You will add photos or videos on the next step. Songs are optional.
              </p>
            ) : entryKind === 'words' ? (
              <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)', margin: '16px 0' }}>
                Write your story and title on the next step. Songs are optional.
              </p>
            ) : null}
            {entryKind === 'song' ? (
            <>
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
          </>
        ) : null}

        {step === 2 ? (
          <>
            {entryKind !== 'words' ? (
              <MemoryMediaPicker draftOrMemoryId={draftId.current} photos={photos} onChange={setPhotos} />
            ) : null}
            <label style={labelStyle}>What does this mean to you?</label>
            <textarea
              value={story}
              onChange={(e) => setStory(e.target.value.slice(0, STORY_MAX))}
              rows={5}
              placeholder="Your story"
              style={{ ...inputStyle, resize: 'vertical', minHeight: 120, lineHeight: 1.45 }}
            />
            <MemoryImproveWithAi field="story" text={story} onUseSuggestion={(s) => setStory(s.slice(0, STORY_MAX))} />
            <p style={{ fontFamily: font, fontSize: TYPE.meta, color: 'var(--text-muted)', margin: '6px 0 20px', textAlign: 'right' }}>
              {story.length}/{STORY_MAX}
            </p>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 80))}
              placeholder={memoryTitlePlaceholder()}
              onBlur={() => setTitleTouched(true)}
              style={inputStyle}
            />
            <MemoryImproveWithAi field="title" text={title} onUseSuggestion={(s) => setTitle(s.slice(0, 80))} />
            <MemorySuggestTitles
              story={story}
              songs={songs.map((s) => `${s.songTitle} — ${s.artistName}`)}
              onPick={(t) => { setTitle(t); setTitleTouched(true) }}
            />
            <p style={{ fontFamily: font, fontSize: TYPE.meta, color: 'var(--text-muted)', margin: '6px 0 0', textAlign: 'right' }}>
              {title.length}/80
            </p>
            {showTitleErr ? (
              <p style={{ fontFamily: font, fontSize: TYPE.meta, color: 'var(--danger, #e57373)', margin: '6px 0 0' }}>{titleErr}</p>
            ) : null}
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
            <p style={{ ...labelStyle, marginBottom: 12 }}>Preview</p>
            <div className="margo-memory-create-preview">
              <div className="margo-memory-create-preview__tile-wrap">
                <ProfileMemoryTile memory={previewMemory} />
              </div>
              <div>
                <div className="margo-memory-detail__hero-row" style={{ marginBottom: 8 }}>
                  {previewMemory.coverUrl ? (
                    <div
                      className="margo-memory-detail__hero-cover"
                      style={{ backgroundImage: `url(${previewMemory.coverUrl})` }}
                    />
                  ) : null}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 className="margo-memory-detail__hero-title">{previewHeading}</h2>
                    <p style={{ margin: 0, fontFamily: font, fontSize: TYPE.meta, color: 'var(--text-secondary)' }}>@you</p>
                    {previewDate ? (
                      <p style={{ margin: '6px 0 0', fontFamily: font, fontSize: TYPE.meta, color: 'var(--text-muted)' }}>{previewDate}</p>
                    ) : null}
                  </div>
                </div>
                {story.trim() && story.trim() !== previewHeading ? (
                  <p style={{ margin: 0, fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                    {story.trim()}
                  </p>
                ) : null}
              </div>
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
