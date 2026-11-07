'use client'

import { ProfileMemoryAddTile, ProfileMemoryMoreTile, ProfileMemoryTile } from '@/components/profile-memory-tile'
import { MargoSectionHeader } from '@/components/margo-section-header'
import type { MemoryPublic } from '@/lib/memory/types'

export function ProfileMemoriesStrip({
  memories,
  isOwnProfile,
}: {
  memories: MemoryPublic[]
  isOwnProfile: boolean
}) {
  if (!isOwnProfile && memories.length === 0) return null

  const maxVisible = 12
  const row = memories.slice(0, maxVisible)
  const showMore = memories.length > maxVisible
  const ownerEmpty = isOwnProfile && memories.length === 0
  const moreHref = isOwnProfile
    ? '/you?tab=memories'
    : (memories[0]?.ownerUsername ? `/profile/${memories[0].ownerUsername}?tab=memories` : '/feed?tab=memories')

  return (
    <div className="margo-profile-memories-strip">
      <MargoSectionHeader title="Memories" className="margo-profile-memories-strip__head" />
      <div className="margo-profile-memories-strip__row">
        {isOwnProfile ? <ProfileMemoryAddTile labeled={ownerEmpty} /> : null}
        {row.map((m, i) => (
          <ProfileMemoryTile key={m.id} memory={m} priority={i < 6} />
        ))}
        {showMore ? <ProfileMemoryMoreTile href={moreHref} label="More" /> : null}
      </div>
    </div>
  )
}
