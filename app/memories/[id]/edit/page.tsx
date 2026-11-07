'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MemoryEditFlow } from '@/components/memory-edit-flow'
import { useRegisterNavBack } from '@/components/nav-back'
import { useAuthGate } from '@/components/supabase-auth-provider'
import type { MemoryPublic } from '@/lib/memory/types'

export default function EditMemoryPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : ''
  const { requireAuth } = useAuthGate()
  const [memory, setMemory] = useState<MemoryPublic | null>(null)
  const [loading, setLoading] = useState(true)

  useRegisterNavBack({ preferHistory: true, fallbackHref: `/memory/${id}` })

  useEffect(() => {
    if (!requireAuth()) return
    if (!id) return
    let active = true
    void fetch(`/api/memories/${id}`)
      .then((r) => r.json())
      .then((data: { memory?: MemoryPublic }) => {
        if (!active) return
        const m = data.memory
        if (!m?.isOwner) {
          router.replace(`/memory/${id}`)
          return
        }
        setMemory(m)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [id, requireAuth, router])

  if (loading || !memory) {
    return (
      <main style={{ padding: '24px 16px', color: 'var(--text-muted)' }}>
        Loading…
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '16px 16px 120px' }}>
      <MemoryEditFlow memory={memory} onClose={() => router.push(`/memory/${id}`)} />
    </main>
  )
}
