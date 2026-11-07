'use client'

import { useState } from 'react'
import { FeedIconHeart, FeedIconHeartFilled } from '@/components/feed-card-icons'
import { useAuthGate } from '@/components/supabase-auth-provider'
import type { MemoryPublic } from '@/lib/memory/types'
import { toast } from 'sonner'

export function MemoryResonateButton({
  memory,
  onMemoryChange,
  compact = false,
}: {
  memory: MemoryPublic
  onMemoryChange: (next: MemoryPublic) => void
  compact?: boolean
}) {
  const { requireAuth } = useAuthGate()
  const [busy, setBusy] = useState(false)

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    if (!requireAuth()) return
    setBusy(true)
    const prev = memory.viewerResonated
    const prevCount = memory.resonateCount
    onMemoryChange({
      ...memory,
      viewerResonated: !prev,
      resonateCount: Math.max(0, prevCount + (prev ? -1 : 1)),
    })
    try {
      const res = await fetch(`/api/memories/${memory.id}/resonate`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Could not resonate')
      const fresh = (data as { memory?: MemoryPublic }).memory
      if (fresh) onMemoryChange(fresh)
    } catch {
      onMemoryChange({ ...memory, viewerResonated: prev, resonateCount: prevCount })
      toast.error('Could not resonate')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={`margo-memory-resonate-btn${compact ? ' margo-memory-resonate-btn--compact' : ''}`}
      aria-pressed={memory.viewerResonated}
      disabled={busy}
      onClick={(e) => void toggle(e)}
    >
      {memory.viewerResonated ? <FeedIconHeartFilled size={compact ? 14 : 18} /> : <FeedIconHeart size={compact ? 14 : 18} />}
      {!compact ? <span>Resonate {memory.resonateCount > 0 ? memory.resonateCount : ''}</span> : (
        <span>{memory.resonateCount > 0 ? memory.resonateCount : ''}</span>
      )}
    </button>
  )
}
