'use client'

import Link from 'next/link'
import type { MemoryPublic } from '@/lib/memory/types'

export function ProfileMemoryAddTile() {
  return (
    <Link href="/memories/new" className="margo-profile-memory-tile margo-profile-memory-tile--add" aria-label="New memory">
      <span className="margo-profile-memory-tile__plus" aria-hidden>+</span>
    </Link>
  )
}

export function ProfileMemoryTile({ memory }: { memory: MemoryPublic }) {
  return (
    <Link
      href={`/memory/${memory.id}`}
      className="margo-profile-memory-tile"
      aria-label={memory.title}
      style={memory.coverUrl ? { backgroundImage: `url(${memory.coverUrl})` } : undefined}
    />
  )
}
