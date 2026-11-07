'use client'

import Link from 'next/link'
import { MemoryCoverCaption } from '@/components/memory-cover-caption'
import { memoryDisplayCaption } from '@/lib/memory/display-caption'
import type { MemoryPublic } from '@/lib/memory/types'

export function ProfileMemoryAddTile() {
  return (
    <Link href="/memories/new" className="margo-profile-memory-tile margo-profile-memory-tile--add" aria-label="New memory">
      <span className="margo-profile-memory-tile__plus" aria-hidden>+</span>
    </Link>
  )
}

export function ProfileMemoryTile({ memory }: { memory: MemoryPublic }) {
  const label = memoryDisplayCaption(memory)
  return (
    <Link
      href={`/memory/${memory.id}`}
      className="margo-profile-memory-tile margo-profile-memory-tile--captioned"
      aria-label={label}
      style={memory.coverUrl ? { backgroundImage: `url(${memory.coverUrl})` } : undefined}
    >
      <MemoryCoverCaption memory={memory} variant="tile" />
    </Link>
  )
}
