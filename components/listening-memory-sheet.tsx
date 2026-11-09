'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MargoSheet } from '@/components/margo-sheet'
import { MargoMemoryFlowOverlay } from '@/components/margo-memory-centered-dialog'
import { KeyboardSafeCtaBar } from '@/components/keyboard-safe-cta-bar'
import { ComposeSearchDropdown, type ComposeSearchHit } from '@/components/compose-search-dropdown'
import { ComposeLinePicker, type ComposeLyricLine } from '@/components/compose-line-picker'
import { MargoSearchInput } from '@/components/margo-search-input'
import { CheckIcon, MusicNoteIcon } from '@/components/icons'
import { compactArtworkUrl } from '@/lib/compact-artwork-url'
import { createClient } from '@/lib/supabase/client'
import { fetchUnifiedSongSearchHits } from '@/lib/song-search/unified-song-search'
import { MARGO_SEARCH_HINT_SONGS } from '@/lib/margo-search-hints'
import {
  formatListeningPeriodFooterLabel,
  listeningDateGranularity,
  listeningPeriodChoices,
  type ListeningPeriodType,
} from '@/lib/memory/listening-period'
import { useInlineSearchDropdownMaxHeight } from '@/hooks/useInlineSearchDropdownMaxHeight'
import { UI_FONT, TYPE } from '@/lib/fonts'
import { toast } from 'sonner'

const font = UI_FONT
const supabase = createClient()
const STORY_MAX = 240

type SelectedSong = {
  songId: string | null
  songTitle: string
  artistName: string
  artwork: string
  isLyricOnly: boolean
  audioUrl?: string | null
  externalListenUrl?: string | null
}

export function ListeningMemorySheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [periodType, setPeriodType] = useState<ListeningPeriodType>('week')
  const [choiceIndex, setChoiceIndex] = useState(0)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<ComposeSearchHit[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchGen = useRef(0)
  const searchWrapRef = useRef<HTMLDivElement | null>(null)
  const songSearchOpen = showResults && query.trim().length >= 2
  const songListMaxH = useInlineSearchDropdownMaxHeight(searchWrapRef, songSearchOpen)

  const [selected, setSelected] = useState<SelectedSong | null>(null)
  const [story, setStory] = useState('')
  const [lineExcerpt, setLineExcerpt] = useState<string | null>(null)
  const [linePickOpen, setLinePickOpen] = useState(false)
  const [lines, setLines] = useState<ComposeLyricLine[]>([])
  const [linesLoading, setLinesLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [desktop, setDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 720px)')
    const apply = () => setDesktop(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!open) return
    setChoiceIndex(0)
  }, [open, periodType])

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

  const choices = useMemo(() => listeningPeriodChoices(periodType), [periodType])
  const activeChoice = choices[choiceIndex] ?? choices[0]
  const footerLabel = activeChoice
    ? formatListeningPeriodFooterLabel({
        type: periodType,
        startIso: activeChoice.startIso,
        endIso: activeChoice.endIso,
      })
    : ''

  const pickSong = useCallback((hit: ComposeSearchHit) => {
    const onMargo = hit.source === 'margo' && hit.margoSongId
    setSelected({
      songId: onMargo ? hit.margoSongId! : null,
      songTitle: hit.title,
      artistName: hit.artist,
      artwork: hit.artwork || '',
      isLyricOnly: !onMargo,
      audioUrl: hit.audioUrl ?? null,
      externalListenUrl: hit.externalListenUrl ?? null,
    })
    setLineExcerpt(null)
    setQuery('')
    setHits([])
    setShowResults(false)
  }, [])

  const openLinePicker = useCallback(async () => {
    if (!selected?.songId) return
    setLinePickOpen(true)
    setLinesLoading(true)
    setLines([])
    try {
      const { data, error } = await supabase
        .from('lyric_lines')
        .select('line_index, text, start_sec, end_sec')
        .eq('song_id', selected.songId)
        .order('line_index', { ascending: true })
      if (!error && data) {
        setLines(
          data.map((row) => ({
            lineIndex: row.line_index,
            text: row.text,
            startSec: row.start_sec,
            endSec: row.end_sec,
          })),
        )
      }
    } finally {
      setLinesLoading(false)
    }
  }, [selected?.songId])

  const save = useCallback(async () => {
    if (!selected || !activeChoice) return
    setSaving(true)
    try {
      const granularity = listeningDateGranularity(periodType)
      const title = selected.songTitle.trim().slice(0, 80)
      const body = {
        title,
        story: story.trim().slice(0, STORY_MAX) || null,
        showDatePublicly: true,
        dateGranularity: granularity,
        dateStart: activeChoice.startIso,
        dateEnd: activeChoice.endIso,
        songs: [
          {
            position: 0,
            songId: selected.songId,
            songTitle: selected.songTitle,
            artistName: selected.artistName,
            lyricExcerpt: lineExcerpt,
            isLyricOnly: selected.isLyricOnly,
          },
        ],
        photos: [],
      }
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Could not save')
        return
      }
      onOpenChange(false)
      toast.success('Saved to your memories')
      if (lineExcerpt && selected.songId) {
        toast(
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: font, fontSize: TYPE.secondary }}>Memory saved</span>
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams({
                  songId: selected.songId!,
                  text: lineExcerpt,
                })
                router.push(`/compose?${params.toString()}`)
              }}
              style={{
                border: '1px solid var(--gold)',
                borderRadius: 10,
                padding: '8px 12px',
                background: 'transparent',
                color: 'var(--gold)',
                fontFamily: font,
                fontSize: TYPE.secondary,
                cursor: 'pointer',
              }}
            >
              Share this line as a lyric
            </button>
          </div>,
          { duration: 8000 },
        )
      }
      router.refresh()
    } finally {
      setSaving(false)
    }
  }, [activeChoice, lineExcerpt, onOpenChange, periodType, router, selected, story])

  const canSave = Boolean(selected) && !saving

  if (linePickOpen && selected?.songId) {
    return (
      <MargoSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Pick a line"
        anchor={desktop ? 'top' : 'bottom'}
        heightMode="fixed"
        maxHeight={desktop ? 'min(82dvh, 640px)' : 'min(88dvh, 680px)'}
      >
        <ComposeLinePicker
          lines={lines}
          loading={linesLoading}
          songTitle={selected.songTitle}
          artistName={selected.artistName}
          onPick={(line) => {
            setLineExcerpt(line.text.trim())
            setLinePickOpen(false)
          }}
          onBack={() => setLinePickOpen(false)}
          audioUrl={selected.audioUrl}
          songId={selected.songId}
          artwork={selected.artwork}
          variant="panel"
        />
      </MargoSheet>
    )
  }

  const listeningBody = (
      <div className="margo-listening-memory margo-listening-memory--flow">
        <div ref={searchWrapRef} className="margo-listening-memory__search" style={{ position: 'relative', zIndex: songSearchOpen ? 60 : 1 }}>
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
            onSelect={pickSong}
            onClose={() => setShowResults(false)}
            variant="compose"
            listMaxHeightPx={songListMaxH ?? undefined}
          />
        </div>

        {selected ? (
          <div className="margo-listening-memory__song">
            {selected.artwork ? (
              <img src={compactArtworkUrl(selected.artwork, 96)} alt="" width={44} height={44} className="margo-listening-memory__song-art" />
            ) : (
              <span className="margo-listening-memory__song-art margo-listening-memory__song-art--empty">
                <MusicNoteIcon size={18} color="var(--gold)" />
              </span>
            )}
            <div className="margo-listening-memory__song-meta">
              <p className="margo-listening-memory__song-title">{selected.songTitle}</p>
              <p className="margo-listening-memory__song-artist">{selected.artistName}</p>
            </div>
          </div>
        ) : null}

        {selected?.songId ? (
          <div className="margo-listening-memory__line-actions">
            <button type="button" className="margo-listening-memory__line-btn" onClick={() => { void openLinePicker() }}>
              {lineExcerpt ? 'Change line' : 'Pick a line'}
            </button>
            {lineExcerpt ? (
              <p className="margo-listening-memory__line-excerpt">{lineExcerpt}</p>
            ) : null}
          </div>
        ) : null}

        <label className="margo-listening-memory__words-label">A few words</label>
        <textarea
          className="margo-listening-memory__words"
          value={story}
          onChange={(e) => setStory(e.target.value.slice(0, STORY_MAX))}
          rows={3}
          placeholder="Optional"
        />

        <p className="margo-listening-memory__when-label">When was this</p>
        <div className="margo-listening-memory__segments" role="tablist" aria-label="Period type">
          {(['week', 'month', 'year'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={periodType === t}
              className={`margo-listening-memory__segment${periodType === t ? ' margo-listening-memory__segment--on' : ''}`}
              onClick={() => setPeriodType(t)}
            >
              {t === 'week' ? 'Week' : t === 'month' ? 'Month' : 'Year'}
            </button>
          ))}
        </div>

        <ul className="margo-listening-memory__choices">
          {choices.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                className={`margo-listening-memory__choice${i === choiceIndex ? ' margo-listening-memory__choice--on' : ''}`}
                onClick={() => setChoiceIndex(i)}
                aria-pressed={i === choiceIndex}
              >
                <span className="margo-listening-memory__choice-range">{c.sub}</span>
                <span className="margo-listening-memory__choice-label">{c.heading}</span>
              </button>
            </li>
          ))}
        </ul>

        <p className="margo-listening-memory__footer-label">
          {periodType === 'week' ? `Week of ${footerLabel.replace(/^Week of /, '')}` : footerLabel}
        </p>
      </div>
  )

  return (
    <>
      <MargoMemoryFlowOverlay
        open={open}
        onOpenChange={onOpenChange}
        title="What are you listening to?"
        scrollClassName="margo-memory-flow-page__scroll--with-cta"
        footer={
          <KeyboardSafeCtaBar pinToLayoutBottom solidBackground bottomGutter={12} zIndex={260} contentMaxWidth={560}>
            <div className="margo-memory-flow-page__cta-inner">
              <div className="margo-memory-create__cta-row">
                <button type="button" className="margo-memory-btn margo-memory-btn--secondary margo-memory-btn--grow" onClick={() => onOpenChange(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="margo-memory-btn margo-memory-btn--primary margo-memory-btn--grow"
                  disabled={!canSave}
                  onClick={() => { void save() }}
                >
                  {saving ? 'Saving…' : 'Done'}
                </button>
              </div>
            </div>
          </KeyboardSafeCtaBar>
        }
      >
        {listeningBody}
      </MargoMemoryFlowOverlay>
    </>
  )
}
