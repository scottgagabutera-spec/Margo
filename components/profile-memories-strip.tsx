'use client'

import Link from 'next/link'
import { UI_FONT, TYPE } from '@/lib/fonts'
import { MemoryCard } from '@/components/memory-card'
import type { MemoryPublic } from '@/lib/memory/types'

const font = UI_FONT

export function ProfileMemoriesStrip({
  memories,
  isOwnProfile,
}: {
  memories: MemoryPublic[]
  isOwnProfile: boolean
}) {
  if (!memories.length) {
    if (!isOwnProfile) return null
    return (
      <div className="margo-profile-memories-strip margo-profile-memories-strip--empty">
        <p className="margo-profile-memories-strip__label">Memories</p>
        <Link href="/memories/new" className="margo-profile-memories-strip__empty-link" style={{ fontFamily: font, fontSize: TYPE.meta }}>
          Create your first memory
        </Link>
      </div>
    )
  }

  const row = memories.slice(0, 8)
  return (
    <div className="margo-profile-memories-strip">
      <div className="margo-profile-memories-strip__head">
        <p className="margo-profile-memories-strip__label">Memories</p>
        {isOwnProfile ? (
          <Link href="/memories/new" className="margo-profile-memories-strip__add" style={{ fontFamily: font, fontSize: TYPE.label }}>
            Add
          </Link>
        ) : null}
      </div>
      <div className="margo-profile-memories-strip__row">
        {row.map((m) => (
          <MemoryCard key={m.id} memory={m} variant="profileGrid" />
        ))}
      </div>
    </div>
  )
}
