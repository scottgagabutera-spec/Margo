'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSongs, Song } from '@/hooks/useSongs'
import { useIsPlaying } from '@/hooks/useAudioEngine'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { CatalogGrid, CatalogSortOption } from '@/components/catalog-grid'

// Same vibe vocabulary + palette used on /discover — kept here as a local
// copy for now since the source isn't exported from app/discover/page.tsx.
// Worth consolidating into a single lib/vibe-colors.ts eventually (this is
// the third place this exact map has been duplicated).
const VIBES = ['ALL', 'CHILL', 'HOPE', 'HEALING', 'GRATEFUL', 'SPIRITUAL', 'NOSTALGIA', 'JOY', 'LOVE', 'HYPE', 'PROUD']
const VIBE_COLORS: Record<string, string> = {
  chill: '#60b8ff', hope: '#7B9FFF', healing: '#4ade80', grateful: '#a0e080',
  spiritual: '#c8a0ff', nostalgia: '#E8C547', joy: '#ffc847', love: '#FF6B9D',
  hype: '#FF4D4D', proud: '#FFB347',
}
function vibeColor(vibe: string | null | undefined): string {
  if (!vibe) return 'var(--gold)'
  return VIBE_COLORS[vibe.toLowerCase()] || 'var(--gold)'
}

// "New" is intentionally left out of the sort set — Song doesn't expose a
// confirmed createdAt/release-date field yet. Add a fourth sort option
// here once that field exists rather than faking recency off something
// else.
const SORT_OPTIONS: CatalogSortOption[] = [
  { value: 'trending', label: 'Trending' },
  { value: 'top', label: 'Top' },
  { value: 'az', label: 'A–Z' },
]

const RANK_BADGE_COUNT = 8

function EarnedTag({ label }: { label: 'Trending' | 'Top' }) {
  return (
    <span style={{
      position: 'absolute', top: '8px', left: '8px',
      fontFamily: 'var(--font-lora), serif', fontSize: '0.46rem', fontWeight: 700,
      letterSpacing: '1px', textTransform: 'uppercase', padding: '3px 8px',
      borderRadius: '50px', background: 'rgba(7,6,10,0.75)',
      border: '1px solid var(--gold-border)', color: 'var(--gold)',
      zIndex: 2,
    }}>{label}</span>
  )
}

function SongCatalogCard({ song, badge }: { song: Song; badge: 'Trending' | 'Top' | null }) {
  const isActive = song.status === 'live' || song.status === 'active'
  const isPlayingThisSong = useIsPlaying(song.id)
  return (
    <Link href={`/song/${song.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        {badge && <EarnedTag label={badge} />}
        {song.artwork ? (
          <Image src={song.artwork} alt={song.title} fill style={{ objectFit: 'cover' }} sizes="220px" />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(232,197,71,0.08), rgba(255,255,255,0.03))' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,6,10,0.85) 0%, transparent 55%)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: '10px' }}>
          {isActive && (
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlayPauseIcon playing={isPlayingThisSong} size={14} color="var(--bg)" />
            </div>
          )}
        </div>
      </div>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem', fontWeight: 600, color: isActive ? 'var(--text)' : 'var(--text-3)', marginBottom: '2px', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.68rem', color: 'var(--text-3)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</p>
    </Link>
  )
}

function VibeFilterRow({ selected, onSelect }: { selected: string; onSelect: (vibe: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
      {VIBES.map(vibe => {
        const active = selected === vibe
        const color = vibe === 'ALL' ? 'var(--gold)' : vibeColor(vibe)
        return (
          <button
            key={vibe}
            onClick={() => onSelect(vibe)}
            style={{
              flexShrink: 0, padding: '5px 12px', borderRadius: '50px',
              fontFamily: 'var(--font-lora), serif', fontSize: '0.52rem', fontWeight: 700,
              letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer',
              background: active ? color : `${color}12`,
              border: `1px solid ${active ? color : `${color}35`}`,
              color: active ? 'var(--bg)' : color,
            }}
          >{vibe}</button>
        )
      })}
    </div>
  )
}

export default function SongsCatalogPage() {
  const { songs, loading } = useSongs()
  const [sort, setSort] = useState('trending')
  const [vibe, setVibe] = useState('ALL')

  const { trendingIds, topIds } = useMemo(() => {
    const byEngagement = [...songs].sort((a, b) => ((b.plays || 0) + (b.resonates || 0) * 3) - ((a.plays || 0) + (a.resonates || 0) * 3))
    const byLyricUses = [...songs].sort((a, b) => (b.lyricUses || 0) - (a.lyricUses || 0))
    return {
      trendingIds: new Set(byEngagement.slice(0, RANK_BADGE_COUNT).map(s => s.id)),
      topIds: new Set(byLyricUses.filter(s => (s.lyricUses || 0) > 0).slice(0, RANK_BADGE_COUNT).map(s => s.id)),
    }
  }, [songs])

  const vibeFiltered = useMemo(() => {
    if (vibe === 'ALL') return songs
    return songs.filter(s => s.lyricLines?.some(l => l.vibes?.includes(vibe)))
  }, [songs, vibe])

  const sorted = useMemo(() => {
    const list = [...vibeFiltered]
    if (sort === 'trending') {
      return list.sort((a, b) => ((b.plays || 0) + (b.resonates || 0) * 3) - ((a.plays || 0) + (a.resonates || 0) * 3))
    }
    if (sort === 'top') {
      return list.sort((a, b) => (b.lyricUses || 0) - (a.lyricUses || 0))
    }
    // az
    return list.sort((a, b) => a.title.localeCompare(b.title))
  }, [vibeFiltered, sort])

  return (
    <CatalogGrid
      items={sorted}
      loading={loading}
      getKey={s => s.id}
      getSearchText={s => `${s.title} ${s.artist}`}
      searchPlaceholder="Search songs, artists…"
      sortOptions={SORT_OPTIONS}
      activeSort={sort}
      onSortChange={setSort}
      extraFilters={<VibeFilterRow selected={vibe} onSelect={setVibe} />}
      emptyMessage="No songs yet."
      minCardWidth={160}
      renderCard={song => (
        <SongCatalogCard
          song={song}
          badge={topIds.has(song.id) ? 'Top' : trendingIds.has(song.id) ? 'Trending' : null}
        />
      )}
    />
  )
}