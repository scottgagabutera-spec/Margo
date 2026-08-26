'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { MargoSearchInput } from '@/components/margo-search-input'
import { BackButton } from '@/components/back-button'
import type { MargoSearchResponse } from '@/lib/meilisearch/types'

const DEBOUNCE_MS = 150

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
        fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', fontWeight: 700,
        color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase',
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
}: {
  href: string
  primary: string
  secondary?: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        padding: '14px 16px', borderRadius: '12px',
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <p style={{
          fontFamily: 'var(--font-lora), serif', fontStyle: 'italic',
          fontSize: '0.9rem', color: 'var(--text)', margin: 0, lineHeight: 1.45,
        }}>{primary}</p>
        {secondary ? (
          <p style={{
            fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem',
            color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase',
            margin: '6px 0 0',
          }}>{secondary}</p>
        ) : null}
      </div>
    </Link>
  )
}

export default function SearchPage() {
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
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
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
  }, [])

  useEffect(() => {
    void runSearch(debounced)
  }, [debounced, runSearch])

  const results = data?.results
  const hasResults = results && (
    results.users.length + results.lyrics.length + results.artists.length + results.catalogLines.length > 0
  )

  return (
    <div style={{
      maxWidth: '640px', margin: '0 auto',
      padding: 'calc(var(--nav-height, 72px) + 20px) 16px var(--margo-page-padding-bottom)',
    }}>
      <div style={{ marginBottom: '12px' }}>
        <BackButton fallbackHref="/feed" />
      </div>
      <h1 style={{
        fontFamily: 'var(--font-lora), serif', fontSize: '1.25rem', fontWeight: 600,
        color: 'var(--text)', marginBottom: '16px',
      }}>Search Margo</h1>

      <MargoSearchInput
        value={query}
        onChange={setQuery}
        placeholder="Users, lyrics, artists…"
        ariaLabel="Search Margo"
      />

      {loading && debounced.length >= 2 && (
        <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '20px' }}>
          Searching…
        </p>
      )}

      {error && (
        <p style={{ fontFamily: 'var(--font-lora), serif', color: 'var(--destructive)', marginTop: '20px' }}>
          {error}
        </p>
      )}

      {!loading && debounced.length >= 2 && !error && !hasResults && (
        <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '20px' }}>
          Nothing found for &ldquo;{debounced}&rdquo;
        </p>
      )}

      {results && (
        <div style={{ marginTop: '24px' }}>
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

          <HitSection title="Posted lyrics" empty={results.lyrics.length === 0}>
            {results.lyrics.map(hit => (
              <ResultCard
                key={hit.id}
                href={hit.postId ? `/post/${hit.postId}` : '/feed'}
                primary={hit.text || hit.title || ''}
                secondary={[hit.subtitle, hit.username ? `@${hit.username}` : ''].filter(Boolean).join(' · ')}
              />
            ))}
          </HitSection>

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

          <HitSection title="Catalog lines" empty={results.catalogLines.length === 0}>
            {results.catalogLines.map(hit => (
              <ResultCard
                key={hit.id}
                href={hit.songId ? `/song/${hit.songId}` : '/discover'}
                primary={hit.text || hit.title || ''}
                secondary={hit.subtitle}
              />
            ))}
          </HitSection>

          {data?.processingTimeMs != null && hasResults && (
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              {data.processingTimeMs}ms
            </p>
          )}
        </div>
      )}
    </div>
  )
}
