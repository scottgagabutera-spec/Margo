'use client'

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { MargoSearchInput } from '@/components/margo-search-input'
import { useRegisterNavBack } from '@/components/nav-back'
import { LoadingRing } from '@/components/loading-ring'
import { SearchRowSkeletonList } from '@/components/margo-skeletons'
import type { MargoSearchHit, MargoSearchResponse } from '@/lib/meilisearch/types'
import {
  getSearchScope,
  markHubOverlayRestore,
  safeSearchFromPath,
  searchFromOpensHub,
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

function Cover({
  src,
  alt,
  round,
  size = 48,
}: {
  src?: string | null
  alt: string
  round?: boolean
  size?: number
}) {
  const radius = round ? '50%' : '8px'
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: radius,
      overflow: 'hidden',
      flexShrink: 0,
      background: 'linear-gradient(135deg, rgba(232,197,71,0.2), rgba(232,197,71,0.05))',
      border: '1px solid var(--gold-border, rgba(232,197,71,0.22))',
    }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: font, fontSize: '0.85rem', fontWeight: 700, color: 'var(--gold)',
        }}>
          {(alt || '?').charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  )
}

function PersonCard({ hit, artist }: { hit: MargoSearchHit; artist?: boolean }) {
  const name = hit.title || hit.username || ''
  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: '12px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
    }}>
      <Link href={`/profile/${hit.username}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <Cover src={hit.artworkUrl} alt={name} round size={48} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{
            fontFamily: font, fontSize: TYPE.song, fontWeight: 600,
            color: 'var(--text)', margin: 0, lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{name}</p>
          <p style={{
            fontFamily: font, fontSize: TYPE.meta, color: 'var(--text-muted)',
            margin: '4px 0 0', letterSpacing: '0.02em',
          }}>
            {hit.subtitle || (hit.username ? `@${hit.username}` : '')}
            {artist ? ' · Artist' : ''}
          </p>
        </div>
      </Link>
      {artist && hit.relatedSongs && hit.relatedSongs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', paddingLeft: '62px' }}>
          {hit.relatedSongs.map((song) => (
            <Link
              key={song.id}
              href={`/song/${song.id}`}
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <Cover src={song.artworkUrl} alt={song.title} size={32} />
              <p style={{
                fontFamily: font, fontSize: TYPE.artist, color: 'var(--text-secondary)',
                margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{song.title}</p>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function SongCard({ hit }: { hit: MargoSearchHit }) {
  const title = hit.title || ''
  const href = hit.songId ? `/song/${hit.songId}` : '/discover/songs'
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '12px 14px', borderRadius: '12px',
        background: 'var(--surface)', border: '1px solid var(--border)',
      }}>
        <Cover src={hit.artworkUrl} alt={title} size={56} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{
            fontFamily: font, fontSize: TYPE.song, fontWeight: 600,
            color: 'var(--text)', margin: 0, lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{title}</p>
          {hit.subtitle ? (
            <p style={{
              fontFamily: font, fontSize: TYPE.artist, color: 'var(--text-secondary)',
              margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{hit.subtitle}</p>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

function LyricCard({ hit }: { hit: MargoSearchHit }) {
  const href = hit.postId ? `/post/${hit.postId}` : (hit.songId ? `/song/${hit.songId}` : '/feed')
  const primary = hit.text || hit.title || ''
  const secondary = [hit.subtitle, hit.username ? `@${hit.username}` : ''].filter(Boolean).join(' · ')
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '14px',
        padding: '14px 16px', borderRadius: '12px',
        background: 'var(--surface)', border: '1px solid var(--border)',
      }}>
        {hit.artworkUrl ? <Cover src={hit.artworkUrl} alt="" size={48} /> : null}
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{
            fontFamily: lyricFont, fontStyle: 'italic', fontSize: TYPE.lyric,
            color: 'var(--text)', margin: 0, lineHeight: 1.45,
          }}>{primary}</p>
          {secondary ? (
            <p style={{
              fontFamily: font, fontSize: TYPE.meta, color: 'var(--text-muted)',
              margin: '6px 0 0', letterSpacing: '0.04em',
            }}>{secondary}</p>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

function SearchPageInner() {
  const params = useSearchParams()
  const scope = useMemo(() => getSearchScope(params.get('scope')), [params])
  const from = safeSearchFromPath(params.get('from')) || scope.backHref
  const playlistId = params.get('playlist')

  useRegisterNavBack({
    fallbackHref: from,
    preferHistory: true,
    replace: true,
    onBack: () => {
      if (scope.id === 'hub' || searchFromOpensHub(from)) {
        markHubOverlayRestore()
      }
      return false
    },
  })

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
      const search = new URLSearchParams()
      search.set('q', q)
      search.set('scope', scope.id)
      if (playlistId) search.set('playlist', playlistId)
      const res = await fetch(`/api/search?${search.toString()}`)
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
  }, [scope.id, playlistId])

  useEffect(() => {
    void runSearch(debounced)
  }, [debounced, runSearch])

  const results = data?.results
  const showPeople = sectionVisible(scope, 'user')
  const showLyrics = sectionVisible(scope, 'lyric')
  const showArtists = sectionVisible(scope, 'artist')
  const showLines = sectionVisible(scope, 'catalog_line')
  const showSongs = sectionVisible(scope, 'song')

  const hasResults = results && (
    (showPeople ? results.users.length : 0) +
    (showLyrics ? results.lyrics.length : 0) +
    (showArtists ? results.artists.length : 0) +
    (showLines ? results.catalogLines.length : 0) +
    (showSongs ? (results.songs?.length || 0) : 0) > 0
  )

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
        <div style={{ marginTop: '8px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginTop: '16px', color: 'var(--text-muted)',
          }}>
            <LoadingRing size={22} strokeWidth={1.75} state="spinning" />
            <p style={{
              fontFamily: font, fontSize: TYPE.meta, letterSpacing: '0.12em',
              textTransform: 'uppercase', margin: 0, fontWeight: 700,
            }}>
              Searching
            </p>
          </div>
          <SearchRowSkeletonList count={4} />
        </div>
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

      {!loading && results && (
        <div style={{ marginTop: '24px' }}>
          {showSongs ? (
            <HitSection title="Songs" empty={!results.songs || results.songs.length === 0}>
              {(results.songs || []).map(hit => (
                <SongCard key={hit.id} hit={hit} />
              ))}
            </HitSection>
          ) : null}

          {showArtists ? (
            <HitSection title="Artists" empty={results.artists.length === 0}>
              {results.artists.map(hit => (
                <PersonCard key={hit.id} hit={hit} artist />
              ))}
            </HitSection>
          ) : null}

          {showPeople ? (
            <HitSection title="People" empty={results.users.length === 0}>
              {results.users.map(hit => (
                <PersonCard key={hit.id} hit={hit} />
              ))}
            </HitSection>
          ) : null}

          {showLyrics ? (
            <HitSection title={scope.id === 'resonance' ? 'Posts' : 'Posted lyrics'} empty={results.lyrics.length === 0}>
              {results.lyrics.map(hit => (
                <LyricCard key={hit.id} hit={hit} />
              ))}
            </HitSection>
          ) : null}

          {showLines ? (
            <HitSection title="Lyric moments" empty={results.catalogLines.length === 0}>
              {results.catalogLines.map(hit => (
                <LyricCard key={hit.id} hit={hit} />
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
