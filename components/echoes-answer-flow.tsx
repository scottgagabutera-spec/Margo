'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { CheckIcon, CloseIcon } from '@/components/icons'
import type { ComposeSearchHit } from '@/components/compose-search-dropdown'
import { EchoesSongSearchPanel } from '@/components/echoes-song-search-panel'
import { MargoSearchInput } from '@/components/margo-search-input'
import { MARGO_SEARCH_HINT_SONGS } from '@/lib/margo-search-hints'
import { compactArtworkUrl } from '@/lib/compact-artwork-url'
import { ECHO_TIME_CHOICES, echoTimeChoiceLabel } from '@/lib/echoes/time-choice'
import type { EchoSongPayloadItem, EchoTimeChoice } from '@/lib/echoes/types'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { clearMargoReturn, readMargoReturn } from '@/lib/margo-feed-return'
import { useRegisterNavBack } from '@/components/nav-back'
import { UI_FONT } from '@/lib/fonts'
import { toast } from 'sonner'

const font = UI_FONT
const MAX_SONGS = 50

type Pick = EchoSongPayloadItem

export function EchoesAnswerFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { requireAuth } = useAuthGate()
  const questionId = searchParams.get('questionId') || ''
  const setId = searchParams.get('setId') || ''

  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<ComposeSearchHit[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const searchGen = useRef(0)
  const searchWrapRef = useRef<HTMLDivElement | null>(null)
  const songSearchOpen = query.trim().length >= 2

  const [picked, setPicked] = useState<Pick[]>([])
  const [timeChoice, setTimeChoice] = useState<EchoTimeChoice>('this_week')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!requireAuth({ returnTo: `/echoes/answer?questionId=${encodeURIComponent(questionId)}&setId=${encodeURIComponent(setId)}` })) {
      return
    }
  }, [requireAuth, questionId, setId])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      setSearchLoading(false)
      setSearchError(null)
      return
    }
    const gen = ++searchGen.current
    setSearchLoading(true)
    setSearchError(null)
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/songs/search?q=${encodeURIComponent(q)}&limit=12`)
          if (gen !== searchGen.current) return
          if (res.status === 429) {
            setSearchError('Too many searches. Try again soon.')
            setHits([])
            return
          }
          if (!res.ok) {
            setSearchError('Search failed.')
            setHits([])
            return
          }
          const data = (await res.json()) as { hits?: ComposeSearchHit[]; error?: string }
          if (data.error && !data.hits?.length) {
            setSearchError(data.error)
            setHits([])
            return
          }
          setHits(data.hits || [])
        } catch {
          if (gen !== searchGen.current) return
          setSearchError('Search failed.')
          setHits([])
        } finally {
          if (gen === searchGen.current) setSearchLoading(false)
        }
      })()
    }, 220)
    return () => window.clearTimeout(t)
  }, [query])

  const pickedKeys = useMemo(() => new Set(picked.map((p) => songKey(p))), [picked])
  const cancel = useCallback(() => {
    const resume = readMargoReturn()
    clearMargoReturn()
    if (resume?.href) {
      router.replace(resume.href)
      if (typeof resume.scrollY === 'number') {
        window.requestAnimationFrame(() => {
          const scroller = document.querySelector('[data-margo-primary-tab="feed"]')
          if (scroller instanceof HTMLElement) scroller.scrollTop = resume.scrollY!
        })
      }
      return
    }
    router.back()
  }, [router])

  useRegisterNavBack({ onBack: cancel, preferHistory: true, fallbackHref: '/feed' })

  const togglePick = (hit: ComposeSearchHit) => {
    const onMargo = hit.source === 'margo' && hit.margoSongId
    const item: Pick = {
      songId: onMargo ? hit.margoSongId! : null,
      songTitle: hit.title,
      artistName: hit.artist,
      artworkUrl: hit.artwork ? compactArtworkUrl(hit.artwork) : null,
      audioUrl: hit.audioUrl ?? null,
      isLyricOnly: !onMargo,
      externalListenUrl: hit.externalListenUrl ?? null,
    }
    const key = songKey(item)
    if (pickedKeys.has(key)) {
      setPicked((prev) => prev.filter((p) => songKey(p) !== key))
      return
    }
    if (picked.length >= MAX_SONGS) {
      toast('You can pick up to 50 songs')
      return
    }
    setPicked((prev) => [...prev, item])
    setQuery('')
  }

  const save = async () => {
    if (!questionId || picked.length === 0 || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/echoes/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          timeChoice,
          payload: { songs: picked },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Could not save')
      const resume = readMargoReturn()
      clearMargoReturn()
      if (setId) router.replace(resume?.href || `/echoes/${setId}`)
      else router.replace(resume?.href || '/feed')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="margo-echoes-answer">
      <header className="margo-echoes-answer__head">
        <button type="button" className="margo-echoes-answer__icon-btn" aria-label="Cancel" onClick={cancel}>
          <CloseIcon size={20} color="var(--text)" />
        </button>
        <button
          type="button"
          className="margo-feed-memory-card__action"
          aria-label="Save answer"
          disabled={picked.length === 0 || saving}
          onClick={() => void save()}
        >
          <CheckIcon size={18} color="var(--bg)" />
        </button>
      </header>
      <h1 className="margo-echoes-answer__title" style={{ fontFamily: font }}>
        What are you listening to?
      </h1>
      <div ref={searchWrapRef} className="margo-echoes-answer__search-wrap">
        <MargoSearchInput
          value={query}
          onChange={setQuery}
          hintText={MARGO_SEARCH_HINT_SONGS}
          ariaLabel="Search songs"
          loading={searchLoading}
          stackAboveOverlay={songSearchOpen}
        />
        <EchoesSongSearchPanel
          open={songSearchOpen}
          loading={searchLoading}
          error={searchError}
          hits={hits}
          query={query.trim()}
          selectedKeys={pickedKeys}
          onPick={togglePick}
        />
      </div>
      <ul className="margo-echoes-answer__list">
        {picked.map((song) => (
          <li key={songKey(song)} className="margo-echoes-answer__row">
            <SongArt song={song} />
            <div className="margo-echoes-answer__meta">
              <p className="margo-echoes-answer__song" style={{ fontFamily: font }}>
                {song.songTitle}
              </p>
              <p className="margo-echoes-answer__artist" style={{ fontFamily: font }}>
                {song.artistName}
              </p>
            </div>
            <button
              type="button"
              className="margo-feed-memory-card__action"
              aria-label="Remove"
              onClick={() => setPicked((prev) => prev.filter((p) => songKey(p) !== songKey(song)))}
            >
              <CheckIcon size={16} color="var(--bg)" />
            </button>
          </li>
        ))}
      </ul>
      <p className="margo-echoes-answer__picked-count" style={{ fontFamily: font }}>
        {picked.length} {picked.length === 1 ? 'song' : 'songs'} picked
      </p>
      <div className="margo-echoes-answer__times" role="group" aria-label="Time period">
        {ECHO_TIME_CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            className={`margo-echoes-answer__time${timeChoice === choice ? ' margo-echoes-answer__time--active' : ''}`}
            onClick={() => setTimeChoice(choice)}
            style={{ fontFamily: font }}
          >
            {echoTimeChoiceLabel(choice)}
          </button>
        ))}
      </div>
    </div>
  )
}

function SongArt({ song }: { song: Pick }) {
  const url = song.artworkUrl
  return (
    <div className="margo-echoes-answer__art">
      {url ? <Image src={url} alt="" fill sizes="48px" className="margo-echoes-answer__art-img" /> : null}
    </div>
  )
}

function songKey(song: Pick): string {
  return song.songId || `${song.songTitle}\0${song.artistName}`
}
