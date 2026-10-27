'use client'

import { useMemo, useState } from 'react'
import { useSongs } from '@/hooks/useSongs'
import { useLyricMoments } from '@/hooks/useLyricMoments'
import { DiscoverVibeFilterRow } from '@/components/discover-vibe-filter-row'
import { DiscoverViewMoreShell } from '@/components/discover-view-more-shell'
import { DiscoverBatchedGrid } from '@/components/discover-batched-grid'
import { DiscoverSongsSortSwitch } from '@/components/discover-songs-sort-switch'
import { SongCatalogCard, type SongCardData } from '@/components/song-catalog-card'
import { SongPreviewSheet, type SongPreviewSeed } from '@/components/song-preview-sheet'
import { DISCOVER_VM_BATCH } from '@/lib/discover-view-more-layout'
import {
  filterSongsByVibe,
  songIdsForVibeFromMomentRows,
  sortSongsCatalog,
  type SongsSortMode,
} from '@/lib/discover-view-more-logic'

export default function SongsCatalogPage() {
  const { songs, loading } = useSongs()
  const { moments: momentRows } = useLyricMoments()
  const [sort, setSort] = useState<SongsSortMode>('trending')
  const [vibe, setVibe] = useState('ALL')
  const [previewSong, setPreviewSong] = useState<SongPreviewSeed | null>(null)

  const handleSelect = (card: SongCardData) => {
    const full = songs.find(s => s.id === card.id)
    setPreviewSong(full ?? card)
  }

  const vibeSongIds = useMemo(
    () => songIdsForVibeFromMomentRows(momentRows, vibe),
    [momentRows, vibe],
  )

  const vibeFiltered = useMemo(
    () => filterSongsByVibe(songs, vibeSongIds),
    [songs, vibeSongIds],
  )

  const sorted = useMemo(
    () => sortSongsCatalog(vibeFiltered, sort),
    [vibeFiltered, sort],
  )

  const resetKey = `${vibe}:${sort}:${sorted.length}`

  return (
    <>
      <DiscoverViewMoreShell
        title="Songs"
        gridKind="songs"
        titleRowEnd={<DiscoverSongsSortSwitch value={sort} onChange={setSort} />}
        vibeFilters={<DiscoverVibeFilterRow selected={vibe} onSelect={setVibe} />}
      >
        <DiscoverBatchedGrid
          kind="songs"
          items={sorted}
          batchSize={DISCOVER_VM_BATCH.songs}
          resetKey={resetKey}
          loading={loading}
          skeletonCount={DISCOVER_VM_BATCH.songs}
          getKey={s => s.id}
          emptyMessage="Nothing here yet."
          renderItem={song => (
            <SongCatalogCard
              song={song}
              discoverTile
              onSelect={handleSelect}
            />
          )}
        />
      </DiscoverViewMoreShell>
      {previewSong ? (
        <SongPreviewSheet song={previewSong} onClose={() => setPreviewSong(null)} />
      ) : null}
    </>
  )
}
