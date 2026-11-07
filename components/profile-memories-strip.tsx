'use client'

import { ProfileMemoryAddTile, ProfileMemoryTile } from '@/components/profile-memory-tile'
import type { MemoryPublic } from '@/lib/memory/types'

export function ProfileMemoriesStrip({
  memories,
  isOwnProfile,
}: {
  memories: MemoryPublic[]
  isOwnProfile: boolean
}) {
  const row = memories.slice(0, 12)

  return (
    <div className="margo-profile-memories-strip">
      <p className="margo-profile-ui-label margo-profile-memories-strip__label">Memories</p>
      <div className="margo-profile-memories-strip__row">
        {isOwnProfile ? <ProfileMemoryAddTile /> : null}
        {row.map((m, i) => (
          <ProfileMemoryTile key={m.id} memory={m} priority={i < 6} />
        ))}
      </div>
    </div>
  )
}
