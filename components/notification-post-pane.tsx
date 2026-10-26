'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PostCard } from '@/components/post-card'
import { usePost } from '@/hooks/usePost'
import { useIdentity } from '@/hooks/useIdentity'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { createClient } from '@/lib/supabase/client'
import { LIST_ROW_TYPE, UI_FONT } from '@/lib/fonts'
const supabase = createClient()

export function NotificationPostPane({ postId }: { postId: string | null }) {
  const router = useRouter()
  const { post, loading } = usePost(postId)
  const { user } = useIdentity()
  const { requireAuth } = useAuthGate()
  const [resonated, setResonated] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const saved = localStorage.getItem('margoResonated')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })
  const [resonateCounts, setResonateCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!post?.id) return
    setResonateCounts((prev) => ({
      ...prev,
      [post.id]: prev[post.id] ?? post.resonates ?? 0,
    }))
  }, [post?.id, post?.resonates])

  const toggleResonate = useCallback(async (id: string) => {
    if (!requireAuth()) return
    const was = resonated.has(id)
    const next = new Set(resonated)
    was ? next.delete(id) : next.add(id)
    setResonated(next)
    try {
      localStorage.setItem('margoResonated', JSON.stringify([...next]))
    } catch { /* ignore */ }
    setResonateCounts((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] ?? 0) + (was ? -1 : 1)),
    }))
    const myId = user?.id
    if (!myId) return
    if (was) {
      await supabase.from('post_resonates').delete().eq('post_id', id).eq('actor_id', myId)
    } else {
      await supabase.from('post_resonates').insert({ post_id: id, actor_id: myId })
    }
  }, [requireAuth, resonated, user?.id])

  const onLyricBack = useCallback(() => {
    if (!post?.id) return
    router.push(`/post/${post.id}?lb=1`)
  }, [post?.id, router])

  if (!postId) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <p style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.preview, color: 'var(--text-muted)', margin: 0 }}>
          Select a notification
        </p>
      </div>
    )
  }

  if (loading || !post) {
    return (
      <p style={{ fontFamily: UI_FONT, color: 'var(--text-muted)', padding: '24px' }}>Loading…</p>
    )
  }

  return (
    <div style={{ padding: '16px 20px var(--margo-page-padding-bottom)', maxWidth: '560px' }}>
      <PostCard
        post={post}
        resonated={resonated.has(post.id)}
        resonateCount={resonateCounts[post.id] ?? post.resonates ?? 0}
        echoCount={post.replies ?? 0}
        onResonate={toggleResonate}
        onExport={() => {}}
        disableCardNav
        threadDetail
        onThreadLyricBack={onLyricBack}
      />
    </div>
  )
}
