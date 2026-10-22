'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { MargoSearchInput } from '@/components/margo-search-input'
import { ComposeSearchDropdown, type ComposeSearchHit } from '@/components/compose-search-dropdown'
import { ComposeLinePicker, type ComposeLyricLine } from '@/components/compose-line-picker'
import { FeedIconSend, FeedIconClose } from '@/components/feed-card-icons'
import { createClient } from '@/lib/supabase/client'
import { fetchUnifiedSongSearchHits } from '@/lib/song-search/unified-song-search'
import { matchLiveCatalogSong } from '@/lib/search-margo-songs'
import { trackEvent } from '@/lib/analytics/track'
import { toastMomentSent } from '@/lib/moment-export/moment-export-toasts'

const supabase = createClient()

export type LyricBackPanelPrefill = {
  lyric: string
  songTitle: string
  artistName: string
  songId: string | null
  startSec: number | null
  endSec: number | null
}

export type LyricBackPanelComposeHandle = {
  scrollIntoView: () => void
}

export type LyricBackPanelComposeProps = {
  parentPostId: string
  parentEmotion: string
  onRequireAuth?: () => boolean
  onSent?: () => void
  prefill?: LyricBackPanelPrefill | null
  /** Portaled search dropdown (feed LB panel). Thread page uses inline compose variant. */
  layout?: 'panel' | 'page'
  /** Shown when replying to a nested Lyric Back (not the root moment). */
  replyToLabel?: string | null
}

type SelectedSong = {
  title: string
  artist: string
  artwork: string
  catalogSongId: string | null
  audioUrl: string | null
}

export const LyricBackPanelCompose = forwardRef<
  LyricBackPanelComposeHandle,
  LyricBackPanelComposeProps
>(function LyricBackPanelCompose(
  {
    parentPostId,
    parentEmotion,
    onRequireAuth,
    onSent,
    prefill,
    layout = 'page',
    replyToLabel,
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const searchAnchorRef = useRef<HTMLDivElement>(null)
  const searchGenRef = useRef(0)
  const isPanelLayout = layout === 'panel'

  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<ComposeSearchHit[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const [selected, setSelected] = useState<SelectedSong | null>(null)
  const [lines, setLines] = useState<ComposeLyricLine[]>([])
  const [linesLoading, setLinesLoading] = useState(false)
  const [linePickDone, setLinePickDone] = useState(false)

  const [lyric, setLyric] = useState('')
  const [snippetStart, setSnippetStart] = useState<number | null>(null)
  const [snippetEnd, setSnippetEnd] = useState<number | null>(null)
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)

  useImperativeHandle(ref, () => ({
    scrollIntoView: () => {
      rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    },
  }))

  const resetSong = useCallback(() => {
    setSelected(null)
    setLines([])
    setLinesLoading(false)
    setLinePickDone(false)
    setLyric('')
    setSnippetStart(null)
    setSnippetEnd(null)
    setPostError(null)
  }, [])

  useEffect(() => {
    if (!prefill?.songTitle) return
    setSelected({
      title: prefill.songTitle,
      artist: prefill.artistName,
      artwork: '',
      catalogSongId: prefill.songId,
      audioUrl: null,
    })
    setLyric(prefill.lyric)
    setSnippetStart(prefill.startSec)
    setSnippetEnd(prefill.endSec)
    setLinePickDone(true)
    if (prefill.songId) {
      setLinesLoading(true)
      void supabase
        .from('lyric_lines')
        .select('line_index, text, start_sec, end_sec')
        .eq('song_id', prefill.songId)
        .order('line_index', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) {
            setLines(data.map((row) => ({
              lineIndex: row.line_index,
              text: row.text,
              startSec: row.start_sec,
              endSec: row.end_sec,
            })))
          }
          setLinesLoading(false)
        })
    }
  }, [prefill])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      searchGenRef.current++
      setHits([])
      setSearchLoading(false)
      setShowResults(false)
      return
    }
    const gen = ++searchGenRef.current
    setSearchLoading(true)
    setShowResults(true)
    const t = window.setTimeout(() => {
      void fetchUnifiedSongSearchHits(supabase, q, 10)
        .then((rows) => {
          if (gen !== searchGenRef.current) return
          setHits(rows)
        })
        .catch(() => {
          if (gen !== searchGenRef.current) return
          setHits([])
        })
        .finally(() => {
          if (gen === searchGenRef.current) setSearchLoading(false)
        })
    }, 280)
    return () => window.clearTimeout(t)
  }, [query])

  const loadCatalogLines = useCallback(async (songId: string) => {
    setLinesLoading(true)
    setLines([])
    try {
      const { data, error } = await supabase
        .from('lyric_lines')
        .select('line_index, text, start_sec, end_sec')
        .eq('song_id', songId)
        .order('line_index', { ascending: true })
      if (!error && data) {
        setLines(data.map((row) => ({
          lineIndex: row.line_index,
          text: row.text,
          startSec: row.start_sec,
          endSec: row.end_sec,
        })))
      }
    } finally {
      setLinesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selected?.catalogSongId || linesLoading) return
    if (lines.length === 0 && !linePickDone) {
      setLinePickDone(true)
    }
  }, [linePickDone, lines.length, linesLoading, selected?.catalogSongId])

  const selectHit = useCallback(async (hit: ComposeSearchHit) => {
    setQuery('')
    setHits([])
    setShowResults(false)
    setPostError(null)
    setLyric('')
    setSnippetStart(null)
    setSnippetEnd(null)
    setLinePickDone(false)

    if (hit.source === 'margo' && hit.margoSongId) {
      setSelected({
        title: hit.title,
        artist: hit.artist,
        artwork: hit.artwork || '',
        catalogSongId: hit.margoSongId,
        audioUrl: hit.audioUrl ?? null,
      })
      await loadCatalogLines(hit.margoSongId)
      return
    }

    try {
      const live = await matchLiveCatalogSong(supabase, hit.title, hit.artist)
      if (live) {
        setSelected({
          title: live.title,
          artist: live.artist,
          artwork: live.artwork || hit.artwork || '',
          catalogSongId: live.id,
          audioUrl: live.audioUrl ?? null,
        })
        await loadCatalogLines(live.id)
        return
      }
    } catch {
      /* external only */
    }

    setSelected({
      title: hit.title,
      artist: hit.artist,
      artwork: hit.artwork || '',
      catalogSongId: null,
      audioUrl: null,
    })
    setLines([])
    setLinePickDone(true)
  }, [loadCatalogLines])

  const onPickLine = useCallback((line: ComposeLyricLine) => {
    setLyric(line.text.slice(0, 140))
    setSnippetStart(line.startSec)
    setSnippetEnd(line.endSec)
    setLinePickDone(true)
  }, [])

  const onPickParagraph = useCallback((picked: ComposeLyricLine[]) => {
    const joined = picked.map((l) => l.text.trim()).filter(Boolean).join('\n')
    setLyric(joined.slice(0, 140))
    const first = picked[0]
    const last = picked[picked.length - 1]
    setSnippetStart(first?.startSec ?? null)
    setSnippetEnd(last?.endSec ?? null)
    setLinePickDone(true)
  }, [])

  const canSend = Boolean(
    selected?.title
    && selected?.artist
    && lyric.trim()
    && !posting,
  )

  const handleSend = useCallback(async () => {
    if (onRequireAuth && !onRequireAuth()) return
    if (!canSend || !selected) return
    setPosting(true)
    setPostError(null)
    try {
      const res = await fetch('/api/posts/lyric-back', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentPostId: parentPostId,
          isPrivate: false,
          text: lyric.trim(),
          emotion: parentEmotion,
          songId: selected.catalogSongId,
          songTitle: selected.title,
          artistName: selected.artist,
          snippetStartSec: snippetStart,
          snippetEndSec: snippetEnd,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPostError(typeof payload.error === 'string' ? payload.error : 'Could not send.')
        return
      }
      trackEvent('lyric_back_sent', { private: false, inline: true })
      toastMomentSent()
      const replyId = typeof payload.id === 'string' ? payload.id : null
      if (replyId) {
        fetch('/api/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: lyric.trim(), postId: replyId }),
        }).catch(() => {})
      }
      resetSong()
      setQuery('')
      onSent?.()
    } catch {
      setPostError('Could not send.')
    } finally {
      setPosting(false)
    }
  }, [
    canSend,
    lyric,
    onRequireAuth,
    onSent,
    parentEmotion,
    parentPostId,
    resetSong,
    selected,
    snippetEnd,
    snippetStart,
  ])

  const showLinePicker = Boolean(
    selected?.catalogSongId
    && !linePickDone
    && (lines.length > 0 || linesLoading),
  )
  const showLyricField = Boolean(selected && (linePickDone || !selected.catalogSongId))

  const searchOpen = showResults && query.trim().length >= 2

  return (
    <div ref={rootRef} className="margo-post-card__lb-compose margo-post-card__lb-compose--inline">
      {replyToLabel ? (
        <p className="margo-post-card__lb-compose-reply-to">{replyToLabel}</p>
      ) : null}
      <div
        ref={searchAnchorRef}
        className="margo-post-card__lb-search-anchor"
        style={isPanelLayout && searchOpen ? { zIndex: 242, position: 'relative' } : undefined}
      >
        <MargoSearchInput
          value={query}
          onChange={setQuery}
          loading={searchLoading}
          placeholder="Search by lyric, song or artist…"
          ariaLabel="Search by lyric, song or artist"
          stackAboveOverlay={isPanelLayout && searchOpen}
          onFocus={() => {
            if (query.trim().length >= 2) setShowResults(true)
          }}
        />
        <ComposeSearchDropdown
          open={searchOpen}
          loading={searchLoading}
          results={hits}
          highlightQuery={query}
          onSelect={(hit) => void selectHit(hit)}
          onClose={() => setShowResults(false)}
          variant={isPanelLayout ? 'panel' : 'compose'}
          anchorRef={isPanelLayout ? searchAnchorRef : undefined}
        />
      </div>

      {selected ? (
        <div className="margo-post-card__lb-compose-track margo-post-card__lb-compose-track--picked">
          <div className="margo-post-card__lb-compose-track-text">
            <span className="margo-post-card__lb-compose-song">{selected.title}</span>
            <span className="margo-post-card__lb-compose-artist">{selected.artist}</span>
          </div>
          <button
            type="button"
            className="margo-post-card__lb-compose-clear"
            aria-label="Clear song"
            onClick={resetSong}
          >
            <FeedIconClose size={14} />
          </button>
        </div>
      ) : null}

      {showLinePicker && selected?.catalogSongId ? (
        <div className="margo-post-card__lb-line-picker">
          <ComposeLinePicker
            lines={lines}
            loading={linesLoading}
            songTitle={selected.title}
            artistName={selected.artist}
            audioUrl={selected.audioUrl}
            songId={selected.catalogSongId}
            artwork={selected.artwork || null}
            enableParagraphPick
            maxParagraphLines={2}
            hideHeader
            variant="compose"
            onPick={onPickLine}
            onPickParagraph={onPickParagraph}
            onBack={() => resetSong()}
          />
        </div>
      ) : null}

      {showLyricField ? (
        <>
          <textarea
            className="margo-post-card__lb-compose-input"
            value={lyric}
            onChange={(e) => setLyric(e.target.value.slice(0, 140))}
            placeholder="Your line"
            rows={3}
            aria-label="Lyric Back text"
          />
          {postError ? (
            <p className="margo-post-card__lb-compose-error" role="alert">{postError}</p>
          ) : null}
          <div className="margo-post-card__lb-compose-bar">
            <button
              type="button"
              className="margo-post-card__lb-compose-send"
              aria-label="Send"
              disabled={!canSend}
              onClick={() => void handleSend()}
            >
              <FeedIconSend size={18} />
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
})
