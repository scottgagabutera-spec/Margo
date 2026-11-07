'use client'

import { useEffect, useRef, useState } from 'react'
import { ComposeSearchDropdown, type ComposeSearchHit } from '@/components/compose-search-dropdown'
import { MargoSearchInput } from '@/components/margo-search-input'
import { createClient } from '@/lib/supabase/client'
import { fetchUnifiedSongSearchHits } from '@/lib/song-search/unified-song-search'

const supabase = createClient()
import { MARGO_SEARCH_HINT_SONGS } from '@/lib/margo-search-hints'
import { TYPE, UI_FONT } from '@/lib/fonts'
import { compactArtworkUrl } from '@/lib/compact-artwork-url'
import { toast } from 'sonner'

const font = UI_FONT

type Mode = 'text' | 'lyric'

export function MemoryReplyComposer({
  memoryId,
  onPosted,
}: {
  memoryId: string
  onPosted: () => void
}) {
  const [mode, setMode] = useState<Mode>('text')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentPulse, setSentPulse] = useState(false)

  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<ComposeSearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [showHits, setShowHits] = useState(false)
  const [pick, setPick] = useState<ComposeSearchHit | null>(null)
  const searchGen = useRef(0)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      return
    }
    const gen = ++searchGen.current
    setLoading(true)
    void fetchUnifiedSongSearchHits(supabase, q).then((list) => {
      if (gen !== searchGen.current) return
      setHits(list)
      setLoading(false)
    })
  }, [query])

  const submit = async () => {
    const body = text.trim()
    if (!body || busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/memories/${memoryId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: mode,
          body,
          songId: mode === 'lyric' && pick?.margoSongId ? pick.margoSongId : null,
          songTitle: mode === 'lyric' ? pick?.title || null : null,
          artistName: mode === 'lyric' ? pick?.artist || null : null,
          lyricExcerpt: mode === 'lyric' ? body : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Could not post')
      setText('')
      setPick(null)
      setQuery('')
      setSentPulse(true)
      setTimeout(() => setSentPulse(false), 900)
      onPosted()
      toast('Reply posted')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not post')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`margo-memory-reply-composer${sentPulse ? ' margo-memory-reply-composer--sent' : ''}`}>
      <p className="margo-memory-detail__section-label">Replies</p>
      <div className="margo-memory-reply-composer__modes">
        <button
          type="button"
          className={`margo-memory-reply-composer__mode${mode === 'text' ? ' margo-memory-reply-composer__mode--on' : ''}`}
          onClick={() => setMode('text')}
        >
          <span className="margo-memory-reply-composer__mode-title">Reply</span>
          <span className="margo-memory-reply-composer__mode-hint">Your own words</span>
        </button>
        <button
          type="button"
          className={`margo-memory-reply-composer__mode${mode === 'lyric' ? ' margo-memory-reply-composer__mode--on' : ''}`}
          onClick={() => setMode('lyric')}
        >
          <span className="margo-memory-reply-composer__mode-title">Lyric back</span>
          <span className="margo-memory-reply-composer__mode-hint">Pick a song &amp; lyric</span>
        </button>
      </div>

      {mode === 'lyric' ? (
        <div className="margo-memory-reply-composer__search">
          <MargoSearchInput
            value={query}
            onChange={(v) => {
              setQuery(v)
              setShowHits(true)
            }}
            onFocus={() => setShowHits(true)}
            hintText={MARGO_SEARCH_HINT_SONGS}
            loading={loading}
            stackAboveOverlay={showHits && query.trim().length >= 2}
          />
          <ComposeSearchDropdown
            open={showHits && query.trim().length >= 2}
            loading={loading}
            results={hits}
            highlightQuery={query}
            onSelect={(hit) => {
              setPick(hit)
              setQuery(`${hit.title} · ${hit.artist}`)
              setShowHits(false)
            }}
            onClose={() => setShowHits(false)}
            variant="compose"
          />
          {pick?.artwork ? (
            <img src={compactArtworkUrl(pick.artwork, 56)} alt="" width={40} height={40} className="margo-memory-reply-composer__art" />
          ) : null}
        </div>
      ) : null}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 500))}
        rows={3}
        placeholder={mode === 'lyric' ? 'Write or paste the lyric line' : 'Write your reply'}
        className="margo-memory-reply-composer__input"
        style={{ fontFamily: font, fontSize: TYPE.secondary }}
      />
      <button
        type="button"
        disabled={busy || !text.trim() || (mode === 'lyric' && !pick)}
        onClick={() => void submit()}
        className="margo-memory-reply-composer__send"
        style={{ fontFamily: font, fontSize: TYPE.label }}
      >
        {busy ? 'Posting…' : 'Post reply'}
      </button>
    </section>
  )
}
