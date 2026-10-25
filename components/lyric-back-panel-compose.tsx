'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { MargoSearchInput } from '@/components/margo-search-input'
import { MomentComposeVibePicker } from '@/components/moment-compose-vibe-picker'
import { emotionToVibeLabel, vibeLabelToEmotion } from '@/lib/moment/vibe'
import { ComposeSearchDropdown, type ComposeSearchHit } from '@/components/compose-search-dropdown'
import { ComposeLinePicker, type ComposeLyricLine } from '@/components/compose-line-picker'
import { FeedIconSend, FeedIconClose } from '@/components/feed-card-icons'
import { LyricBackTrackListenControl } from '@/components/lyric-back-track-listen-control'
import { PostThumbnail } from '@/components/post-thumbnail'
import { createClient } from '@/lib/supabase/client'
import { fetchUnifiedSongSearchHits } from '@/lib/song-search/unified-song-search'
import { matchLiveCatalogSong } from '@/lib/search-margo-songs'
import { trackEvent } from '@/lib/analytics/track'
import { toastMomentSent } from '@/lib/moment-export/moment-export-toasts'
import { compactArtworkUrl } from '@/lib/compact-artwork-url'
import { matchLyricLine } from '@/lib/lyric-match'
import type { PostLine } from '@/lib/post-lines'

const supabase = createClient()

export type LyricBackPanelPrefill = {
  lyric: string
  songTitle: string
  artistName: string
  songId: string | null
  audioUrl?: string | null
  externalListenUrl?: string | null
  artwork?: string | null
  startSec: number | null
  endSec: number | null
}

export type LyricBackPanelComposeHandle = {
  focusSearch: () => void
  save: () => void
}

export type LyricBackSavePayload = {
  text: string
  songTitle: string
  artistName: string
  emotion: string
  songId: string | null
  snippetStartSec: number | null
  snippetEndSec: number | null
  artworkUrl: string | null
  externalListenUrl: string | null
  audioUrl: string | null
}

export type LyricBackPanelComposeProps = {
  parentPostId: string
  parentEmotion: string
  mode?: 'create' | 'edit'
  /** Default lyric-back PATCH; moment uses /api/posts/moment. */
  editTarget?: 'lyric-back' | 'moment'
  editPostId?: string
  momentSourceLines?: PostLine[]
  submitEmotion?: string
  onRequireAuth?: () => boolean
  onSent?: () => void
  onSaved?: (payload: LyricBackSavePayload) => void
  prefill?: LyricBackPanelPrefill | null
  /** Portaled search dropdown (feed LB panel). Thread page uses inline compose variant. */
  layout?: 'panel' | 'page'
  /** Shown when replying to a nested Lyric Back (not the root moment). */
  replyToLabel?: string | null
  /** Focus catalog search when compose mounts (post page / panel open). */
  focusSearchOnMount?: boolean
  /** Panel chrome: search sits in the one-row bar. */
  renderBar?: (search: ReactNode) => ReactNode
  /** Feed first Lyric Back: tabs in pin, search below the post context. */
  pinSearchInBar?: boolean
  /** Rendered after song/line (e.g. vibe + Save). Hides built-in panel send when set. */
  panelAfterBody?: ReactNode
  onPostingChange?: (posting: boolean) => void
  /** When true (edit + active Lyric Backs on parent), song search and line are read-only. */
  lockSongAndLine?: boolean
}

type SelectedSong = {
  title: string
  artist: string
  artwork: string
  catalogSongId: string | null
  audioUrl: string | null
  externalListenUrl: string | null
}

export const LyricBackPanelCompose = forwardRef<
  LyricBackPanelComposeHandle,
  LyricBackPanelComposeProps
>(function LyricBackPanelCompose(
  {
    parentPostId,
    parentEmotion,
    mode = 'create',
    editTarget = 'lyric-back',
    editPostId,
    momentSourceLines,
    submitEmotion,
    onRequireAuth,
    onSent,
    onSaved,
    prefill,
    layout = 'page',
    replyToLabel,
    focusSearchOnMount = false,
    renderBar,
    pinSearchInBar = true,
    panelAfterBody,
    onPostingChange,
    lockSongAndLine = false,
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const lyricRef = useRef<HTMLTextAreaElement>(null)
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
  useEffect(() => {
    onPostingChange?.(posting)
  }, [onPostingChange, posting])
  const [postError, setPostError] = useState<string | null>(null)
  const [composeVibeLabel, setComposeVibeLabel] = useState(
    () => emotionToVibeLabel(parentEmotion) || 'Chill',
  )

  useEffect(() => {
    setComposeVibeLabel(emotionToVibeLabel(parentEmotion) || 'Chill')
  }, [parentPostId, parentEmotion])

  const handleSendRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (!focusSearchOnMount) return
    const t = window.setTimeout(() => {
      const input = rootRef.current?.querySelector('input')
      if (input instanceof HTMLInputElement) input.focus()
    }, 80)
    return () => window.clearTimeout(t)
  }, [focusSearchOnMount, parentPostId])

  const blurSearch = useCallback(() => {
    const input = rootRef.current?.querySelector('input')
    if (input instanceof HTMLInputElement) input.blur()
  }, [])

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
    setQuery('')
    setHits([])
    setSearchLoading(false)
    setShowResults(false)
    resetSong()
  }, [parentPostId, resetSong])

  useEffect(() => {
    if (!prefill?.songTitle) return
    setSelected({
      title: prefill.songTitle,
      artist: prefill.artistName,
      artwork: prefill.artwork ?? '',
      catalogSongId: prefill.songId,
      audioUrl: prefill.audioUrl ?? null,
      externalListenUrl: prefill.externalListenUrl ?? null,
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
        artwork: compactArtworkUrl(hit.artwork, 64) || hit.artwork || '',
        catalogSongId: hit.margoSongId,
        audioUrl: hit.audioUrl ?? null,
        externalListenUrl: hit.externalListenUrl ?? null,
      })
      await loadCatalogLines(hit.margoSongId)
      blurSearch()
      return
    }

    try {
      const live = await matchLiveCatalogSong(supabase, hit.title, hit.artist)
      if (live) {
        setSelected({
          title: live.title,
          artist: live.artist,
          artwork: compactArtworkUrl(live.artwork || hit.artwork, 64) || live.artwork || hit.artwork || '',
          catalogSongId: live.id,
          audioUrl: live.audioUrl ?? null,
          externalListenUrl: hit.externalListenUrl ?? null,
        })
        await loadCatalogLines(live.id)
        blurSearch()
        return
      }
    } catch {
      /* external only */
    }

    setSelected({
      title: hit.title,
      artist: hit.artist,
      artwork: compactArtworkUrl(hit.artwork, 64) || hit.artwork || '',
      catalogSongId: null,
      audioUrl: null,
      externalListenUrl: hit.externalListenUrl ?? null,
    })
    setLines([])
    setLinePickDone(true)
    blurSearch()
  }, [blurSearch, loadCatalogLines])

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
    const emotion = submitEmotion
      ?? vibeLabelToEmotion(composeVibeLabel)
      ?? parentEmotion
    const body = {
      text: lyric.trim(),
      emotion,
      songId: selected.catalogSongId,
      songTitle: selected.title,
      artistName: selected.artist,
      snippetStartSec: snippetStart,
      snippetEndSec: snippetEnd,
      externalListenUrl: selected.externalListenUrl,
      artworkUrl: selected.artwork || null,
    }
    try {
      if (mode === 'edit') {
        if (!editPostId) {
          setPostError('Could not save.')
          return
        }
        if (editTarget === 'moment') {
          const source = momentSourceLines?.length
            ? momentSourceLines
            : [{
                position: 0,
                text: body.text,
                songId: selected.catalogSongId,
                songTitle: body.songTitle,
                artistName: body.artistName,
                artworkUrl: body.artworkUrl,
                snippetStart: snippetStart,
                snippetEnd: snippetEnd,
                source: selected.catalogSongId ? 'catalog' as const : 'external' as const,
              }]
          let line0 = { ...source[0], text: body.text, songId: selected.catalogSongId, songTitle: body.songTitle, artistName: body.artistName, artworkUrl: body.artworkUrl, snippetStart, snippetEnd }
          if (line0.songId) {
            const match = await matchLyricLine(supabase, line0.songId, body.text)
            if (match) {
              line0 = { ...line0, snippetStart: match.startSec ?? snippetStart, snippetEnd: match.endSec ?? snippetEnd }
            }
          }
          const payloadLines = source.map((line, idx) => {
            const row = idx === 0 ? line0 : line
            return {
              text: row.text,
              song_id: row.songId || '',
              song_title: row.songTitle || '',
              artist_name: row.artistName || '',
              artwork_url: row.artworkUrl || '',
              snippet_start_sec: row.snippetStart ?? '',
              snippet_end_sec: row.snippetEnd ?? '',
              source: row.source || (row.songId ? 'catalog' : 'external'),
            }
          })
          const res = await fetch('/api/posts/moment', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: editPostId, lines: payloadLines, emotion }),
          })
          const payload = await res.json().catch(() => ({}))
          if (!res.ok) {
            setPostError(typeof payload.error === 'string' ? payload.error : 'Could not save.')
            return
          }
          fetch('/api/moderate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: body.text, postId: editPostId }),
          }).catch(() => {})
          onSaved?.({
            text: body.text,
            songTitle: body.songTitle,
            artistName: body.artistName,
            emotion,
            songId: selected.catalogSongId,
            snippetStartSec: line0.snippetStart ?? snippetStart,
            snippetEndSec: line0.snippetEnd ?? snippetEnd,
            artworkUrl: selected.artwork || null,
            externalListenUrl: selected.externalListenUrl,
            audioUrl: selected.audioUrl,
          })
          return
        }
        const res = await fetch('/api/posts/lyric-back', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: editPostId, ...body }),
        })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) {
          setPostError(typeof payload.error === 'string' ? payload.error : 'Could not save.')
          return
        }
        onSaved?.({
          text: body.text,
          songTitle: body.songTitle,
          artistName: body.artistName,
          emotion: typeof payload.emotion === 'string' ? payload.emotion : emotion,
          songId: selected.catalogSongId,
          snippetStartSec: snippetStart,
          snippetEndSec: snippetEnd,
          artworkUrl: selected.artwork || null,
          externalListenUrl: selected.externalListenUrl,
          audioUrl: selected.audioUrl,
        })
        return
      }

      const res = await fetch('/api/posts/lyric-back', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentPostId: parentPostId,
          isPrivate: false,
          ...body,
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
      setPostError(mode === 'edit' ? 'Could not save.' : 'Could not send.')
    } finally {
      setPosting(false)
    }
  }, [
    canSend,
    editPostId,
    editTarget,
    momentSourceLines,
    lyric,
    mode,
    onRequireAuth,
    onSaved,
    onSent,
    parentEmotion,
    parentPostId,
    resetSong,
    selected,
    snippetEnd,
    snippetStart,
    submitEmotion,
    composeVibeLabel,
  ])

  handleSendRef.current = () => {
    void handleSend()
  }

  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      const input = rootRef.current?.querySelector('input')
      if (!(input instanceof HTMLInputElement)) return
      try {
        input.focus({ preventScroll: true })
      } catch {
        input.focus()
      }
    },
    save: () => {
      handleSendRef.current()
    },
  }))

  const showLinePicker = Boolean(
    selected?.catalogSongId
    && !linePickDone
    && (lines.length > 0 || linesLoading),
  )
  const showLyricField = Boolean(selected && (linePickDone || !selected.catalogSongId))

  const syncPanelLyricHeight = useCallback(() => {
    const el = lyricRef.current
    if (!el || !isPanelLayout) return
    el.style.height = 'auto'
    const styles = getComputedStyle(el)
    const lineHeight = Number.parseFloat(styles.lineHeight) || 20
    const pad =
      Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom)
    const minH = lineHeight * 2 + pad
    const maxH = lineHeight * 5 + pad
    const contentH = el.scrollHeight
    const next = Math.min(maxH, Math.max(minH, contentH))
    el.style.height = `${next}px`
    el.style.overflowY = contentH > maxH ? 'auto' : 'hidden'
  }, [isPanelLayout])

  useLayoutEffect(() => {
    if (!showLyricField || !isPanelLayout) return
    syncPanelLyricHeight()
  }, [isPanelLayout, lyric, showLyricField, syncPanelLyricHeight])

  const searchOpen = showResults && query.trim().length >= 2

  const searchField = (
    <div
      ref={searchAnchorRef}
      className="margo-post-card__lb-search-anchor"
      style={isPanelLayout && searchOpen ? { zIndex: 242, position: 'relative' } : undefined}
    >
      <MargoSearchInput
        value={query}
        onChange={setQuery}
        loading={searchLoading}
        placeholder={isPanelLayout ? 'Search' : 'Search by lyric, song or artist…'}
        ariaLabel="Search by lyric, song or artist"
        catalogHints
        compact={isPanelLayout}
        stackAboveOverlay={isPanelLayout && searchOpen}
        autoFocus={focusSearchOnMount && !lockSongAndLine}
        disabled={lockSongAndLine}
        onFocus={() => {
          if (lockSongAndLine) return
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
  )

  const songChip = selected ? (
    <div
      className={`margo-song-row margo-post-card__lb-compose-track${
        isPanelLayout ? ' margo-post-card__lb-compose-track--chip' : ' margo-post-card__lb-compose-track--picked'
      }`}
    >
      {selected.artwork ? (
        <PostThumbnail
          artwork={compactArtworkUrl(selected.artwork, 64) || selected.artwork}
          alt=""
          loading="lazy"
          className={
            isPanelLayout
              ? 'margo-post-card__lb-compose-art margo-song-row__art'
              : 'margo-song-row__art'
          }
        />
      ) : (
        <span
          className={
            isPanelLayout
              ? 'margo-post-card__lb-compose-art margo-post-card__lb-compose-art--empty margo-song-row__art margo-song-row__art--empty'
              : 'margo-song-row__art margo-song-row__art--empty'
          }
          aria-hidden
        />
      )}
      <div className="margo-song-row__meta">
        <span className="margo-song-row__title margo-post-card__lb-compose-song">{selected.title}</span>
        <span className="margo-song-row__artist margo-post-card__lb-compose-artist">{selected.artist}</span>
      </div>
      <div className="margo-song-row__trail">
        <LyricBackTrackListenControl
          className={isPanelLayout ? 'margo-post-card__lb-compose-open' : undefined}
          songId={selected.catalogSongId}
          audioUrl={selected.audioUrl}
          songTitle={selected.title}
          artistName={selected.artist}
          externalListenUrl={selected.externalListenUrl}
          startSec={snippetStart}
          endSec={snippetEnd}
          lineText={lyric}
          artwork={selected.artwork || null}
          source="feed"
        />
        {!lockSongAndLine ? (
          <button
            type="button"
            className="margo-post-card__lb-compose-clear"
            aria-label="Remove song"
            onClick={resetSong}
          >
            <FeedIconClose size={isPanelLayout ? 12 : 14} />
          </button>
        ) : null}
      </div>
    </div>
  ) : null

  const linePicker = showLinePicker && selected?.catalogSongId ? (
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
            variant={isPanelLayout ? 'panel' : 'compose'}
            onPick={onPickLine}
        onPickParagraph={onPickParagraph}
        onBack={() => resetSong()}
      />
    </div>
  ) : null

  const lyricBlock = showLyricField ? (
    <div
      className={
        isPanelLayout
          ? 'margo-post-card__lb-compose-lyric margo-post-card__lb-compose-lyric--panel'
          : undefined
      }
    >
      <textarea
        ref={isPanelLayout ? lyricRef : undefined}
        className={`margo-post-card__lb-compose-input${isPanelLayout ? ' margo-post-card__lb-compose-input--panel' : ''}`}
        data-lb-lyric={isPanelLayout ? '1' : undefined}
        value={lyric}
        onChange={(e) => setLyric(e.target.value.slice(0, 140))}
        placeholder="Write your line…"
        rows={isPanelLayout ? 2 : 3}
        aria-label="Lyric Back text"
        readOnly={lockSongAndLine}
        aria-readonly={lockSongAndLine || undefined}
      />
      {postError ? (
        <p className="margo-post-card__lb-compose-error" role="alert">{postError}</p>
      ) : null}
      {isPanelLayout && !panelAfterBody ? (
        <div className="margo-post-card__lb-compose-send-row">
          <MomentComposeVibePicker
            compact
            density="panel"
            vibeLabel={composeVibeLabel}
            onVibeSelect={setComposeVibeLabel}
          />
          <button
            type="button"
            className="margo-post-card__lb-compose-send margo-post-card__lb-compose-send--panel"
            aria-label={mode === 'edit' ? (posting ? 'Saving…' : 'Save') : 'Send'}
            disabled={!canSend || posting}
            onClick={() => void handleSend()}
          >
            {mode === 'edit' && posting ? (
              <span className="margo-post-card__lb-compose-saving">Saving…</span>
            ) : (
              <FeedIconSend size={14} />
            )}
          </button>
        </div>
      ) : !isPanelLayout ? (
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
      ) : null}
    </div>
  ) : null

  const panelVibeFooter = isPanelLayout && selected && !showLyricField && !panelAfterBody ? (
    <div className="margo-post-card__lb-compose-vibe-only">
      <MomentComposeVibePicker
        compact
        density="panel"
        vibeLabel={composeVibeLabel}
        onVibeSelect={setComposeVibeLabel}
      />
    </div>
  ) : null

  const body = songChip || linePicker || lyricBlock || panelVibeFooter ? (
    <div
      className={
        'margo-post-card__lb-compose-body'
        + (lockSongAndLine && isPanelLayout ? ' margo-post-edit-locked-fields' : '')
      }
    >
      {songChip}
      {linePicker}
      {lyricBlock}
      {panelVibeFooter}
    </div>
  ) : null

  return (
    <div
      ref={rootRef}
      className={`margo-post-card__lb-compose margo-post-card__lb-compose--inline${isPanelLayout ? ' margo-post-card__lb-compose--panel' : ''}`}
    >
      {!isPanelLayout && replyToLabel ? (
        <p className="margo-post-card__lb-compose-reply-to">{replyToLabel}</p>
      ) : null}
      {renderBar
        ? renderBar(isPanelLayout && !pinSearchInBar ? null : searchField)
        : searchField}
      {body}
      {isPanelLayout && !pinSearchInBar && !selected ? (
        <div className="margo-post-card__lb-search-footer" data-lb-search-footer="1">
          <div className="margo-post-card__lb-search-footer__vibe">
            <MomentComposeVibePicker
              compact
              density="panel"
              vibeLabel={composeVibeLabel}
              onVibeSelect={setComposeVibeLabel}
            />
          </div>
          {searchField}
        </div>
      ) : null}
      {panelAfterBody ? (
        <div className="margo-post-card__lb-compose-panel-footer">{panelAfterBody}</div>
      ) : null}
    </div>
  )
})
