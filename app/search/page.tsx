'use client'

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { MargoSearchInput } from '@/components/margo-search-input'
import { useRegisterNavBack } from '@/components/nav-back'
import type { MargoSearchResponse } from '@/lib/meilisearch/types'
import {
  getSearchScope,
  safeSearchFromPath,
  sectionVisible,
} from '@/lib/search-scope'
import { TYPE, UI_FONT, LYRIC_FONT } from '@/lib/fonts'

const DEBOUNCE_MS = 150
const font = UI_FONT
const lyricFont = LYRIC_FONT

function HitSection({
  title,
  empty,
  children,
}: {
  title: string
  empty: boolean
  children: React.ReactNode
}) {
  if (empty) return null
  return (
    <section style={{ marginBottom: '28px' }}>
      <p style={{
        fontFamily: font, fontSize: TYPE.label, fontWeight: 700,
        color: 'var(--text-muted)', letterSpacing: '0.16em', textTransform: 'uppercase',
        marginBottom: '12px',
      }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{children}</div>
    </section>
  )
}

function ResultCard({
  href,
  primary,
  secondary,
  lyric,
}: {
  href: string
  primary: string
  secondary?: string
  lyric?: boolean
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        padding: '14px 16px', borderRadius: '12px',
        background: 'var(--surface)', border: '1px solid var(--border)',
      }}>
        <p style={{
          fontFamily: lyric ? lyricFont : font,
          fontStyle: lyric ? 'italic' : 'normal',
          fontSize: lyric ? TYPE.lyric : TYPE.song,
          fontWeight: lyric ? 400 : 600,
          color: 'var(--text)', margin: 0, lineHeight: 1.45,
        }}>{primary}</p>
        {secondary ? (
          <p style={{
            fontFamily: font, fontSize: TYPE.meta,
            color: 'var(--text-muted)', letterSpacing: '0.04em',
            margin: '6px 0 0',
          }}>{secondary}</p>
        ) : null}
      </div>
    </Link>
  )
}

function SearchPageInner() {
  const params = useSearchParams()
  const scope = useMemo(() => getSearchScope(params.get('scope')), [params])
  const from = safeSearchFromPath(params.get('from')) || scope.backHref

  useRegisterNavBack({ fallbackHref: from })

  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [data, setData] = useState<MargoSearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [query])

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }
    const id = ++reqId.current
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&scope=${encodeURIComponent(scope.id)}`)
      const json = (await res.json()) as MargoSearchResponse & { error?: string }
      if (id !== reqId.current) return
      if (!res.ok) throw new Error(json.error || `Search failed (${res.status})`)
      setData(json)
    } catch (e) {
      if (id !== reqId.current) return
      setError(e instanceof Error ? e.message : 'Search failed')
      setData(null)
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [scope.id])

  useEffect(() => {
    void runSearch(debounced)
  }, [debounced, runSearch])

  const results = data?.results
  const showPeople = sectionVisible(scope, 'user')
  const showLyrics = sectionVisible(scope, 'lyric')
  const showArtists = sectionVisible(scope, 'artist')
  const showLines = sectionVisible(scope, 'catalog_line')

  const hasResults = results && (
    (showPeople ? results.users.length : 0) +
    (showLyrics ? results.lyrics.length : 0) +
    (showArtists ? results.artists.length : 0) +
    (showLines ? results.catalogLines.length : 0) > 0
  )

  const lineTitle = scope.id === 'songs' ? 'Songs' : 'Lyric moments'

  return (
    <div style={{
      maxWidth: '640px', margin: '0 auto',
      padding: 'calc(var(--nav-height, 72px) + 16px) 16px var(--margo-page-padding-bottom)',
    }}>
      <MargoSearchInput
        value={query}
        onChange={setQuery}
        placeholder={scope.placeholder}
        ariaLabel={scope.placeholder}
        autoFocus
      />

      {loading && debounced.length >= 2 && (
        <p style={{ fontFamily: font, fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '20px', fontSize: TYPE.secondary }}>
          Searching…
        </p>
      )}

      {error && (
        <p style={{ fontFamily: font, color: 'var(--text-secondary)', marginTop: '20px', fontSize: TYPE.secondary }}>
          {error}
        </p>
      )}

      {!loading && debounced.length >= 2 && !error && !hasResults && (
        <p style={{ fontFamily: lyricFont, fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '20px', fontSize: TYPE.secondary }}>
          Nothing found for &ldquo;{debounced}&rdquo;
        </p>
      )}

      {results && (
        <div style={{ marginTop: '24px' }}>
          {showPeople ? (
            <HitSection title="People" empty={results.users.length === 0}>
              {results.users.map(hit => (
                <ResultCard
                  key={hit.id}
                  href={`/profile/${hit.username}`}
                  primary={hit.title || hit.username || ''}
                  secondary={hit.subtitle}
                />
              ))}
            </HitSection>
          ) : null}

          {showLyrics ? (
            <HitSection title="Posted lyrics" empty={results.lyrics.length === 0}>
              {results.lyrics.map(hit => (
                <ResultCard
                  key={hit.id}
                  href={hit.postId ? `/post/${hit.postId}` : '/feed'}
                  primary={hit.text || hit.title || ''}
                  secondary={[hit.subtitle, hit.username ? `@${hit.username}` : ''].filter(Boolean).join(' · ')}
                  lyric
                />
              ))}
            </HitSection>
          ) : null}

          {showArtists ? (
            <HitSection title="Artists" empty={results.artists.length === 0}>
              {results.artists.map(hit => (
                <ResultCard
                  key={hit.id}
                  href={`/profile/${hit.username}`}
                  primary={hit.title || hit.username || ''}
                  secondary="Artist"
                />
              ))}
            </HitSection>
          ) : null}

          {showLines ? (
            <HitSection title={lineTitle} empty={results.catalogLines.length === 0}>
              {results.catalogLines.map(hit => (
                <ResultCard
                  key={hit.id}
                  href={hit.songId ? `/song/${hit.songId}` : '/discover'}
                  primary={hit.text || hit.title || ''}
                  secondary={hit.subtitle}
                  lyric
                />
              ))}
            </HitSection>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageInner />
    </Suspense>
  )
}
