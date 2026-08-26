'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { usePost } from '@/hooks/usePost'
import { useEchoes } from '@/hooks/useEchoes'
import { PostCard } from '@/components/post-card'
import { CardExportModal } from '@/components/card-export-modal'
import { resolveMargoMomentFromPost } from '@/lib/moment'
import type { Post } from '@/hooks/usePosts'
import type { Echo } from '@/hooks/useEchoes'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useIdentity } from '@/hooks/useIdentity'
import { createClient } from '@/lib/supabase/client'
import { BackButton } from '@/components/back-button'

const supabase = createClient()

const font = 'var(--font-lora), serif'

function echoToPost(lb: Echo): Post {
  return {
    id: lb.id,
    text: lb.lyric,
    emotion: lb.emotion,
    status: lb.status,
    knowledge: (lb.song || lb.artist || lb.artwork)
      ? { song: lb.song || undefined, artist: lb.artist || undefined, artwork: lb.artwork ?? null }
      : undefined,
    username: lb.username,
    authorUid: lb.authorUid ?? null,
    authorAvatarUrl: lb.authorAvatarUrl ?? null,
    authorDisplayName: lb.displayName ?? null,
    timestamp: lb.timestamp,
    resonates: lb.resonateCount ?? 0,
    replies: lb.echoCount ?? 0,
    songId: lb.songId ?? null,
    audioUrl: lb.audioUrl ?? null,
    snippetStart: lb.snippetStart ?? null,
    snippetEnd: lb.snippetEnd ?? null,
  }
}

export default function PostDetailPage() {
  const params = useParams<{ id: string }>()
  const postId = params.id || null
  const { post, loading } = usePost(postId)
  const { echoes } = useEchoes(postId)
  const { requireAuth } = useAuthGate()
  const { user } = useIdentity()
  const [resonated, setResonated] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const saved = localStorage.getItem('margoResonated')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  const [resonateCounts, setResonateCounts] = useState<Record<string, number>>({})
  const [exportPost, setExportPost] = useState<Post | null>(null)

  useEffect(() => {
    if (!post) return
    setResonateCounts(prev => ({
      ...prev,
      [post.id]: prev[post.id] ?? post.resonates ?? 0,
    }))
  }, [post])

  const toggleResonate = async (id: string) => {
    if (!requireAuth()) return
    if (!user?.id) return
    const already = resonated.has(id)
    const myId = user.id
    setResonated(prev => {
      const next = new Set(prev)
      already ? next.delete(id) : next.add(id)
      try { localStorage.setItem('margoResonated', JSON.stringify([...next])) } catch {}
      return next
    })
    setResonateCounts(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] ?? 0) + (already ? -1 : 1)),
    }))
    try {
      if (already) {
        const { error } = await supabase.from('post_resonates').delete().eq('post_id', id).eq('actor_id', myId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('post_resonates').insert({ post_id: id, actor_id: myId })
        if (error) throw error
      }
    } catch {
      setResonated(prev => {
        const next = new Set(prev)
        already ? next.add(id) : next.delete(id)
        return next
      })
      setResonateCounts(prev => ({
        ...prev,
        [id]: Math.max(0, (prev[id] ?? 0) + (already ? 1 : -1)),
      }))
    }
  }

  const handleExport = (p: Post) => {
    if (!requireAuth()) return
    setExportPost(p)
  }

  return (
    <main style={{
      minHeight: '100vh', background: 'var(--bg)',
      padding: 'calc(var(--nav-height, 72px) + 24px) 20px var(--margo-page-padding-bottom)',
      maxWidth: '640px', margin: '0 auto',
    }}>
      <div style={{ marginBottom: '16px' }}>
        <BackButton fallbackHref="/feed" />
      </div>

      {loading && (
        <p style={{ fontFamily: font, fontStyle: 'italic', color: 'var(--text-muted)' }}>
          Loading…
        </p>
      )}

      {!loading && !post && (
        <p style={{ fontFamily: font, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
          This lyric isn&apos;t here anymore.
        </p>
      )}

      {post && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <PostCard
            post={post}
            resonated={resonated.has(post.id)}
            resonateCount={resonateCounts[post.id] ?? post.resonates ?? 0}
            echoCount={post.replies ?? echoes.length}
            onResonate={toggleResonate}
            onExport={handleExport}
            disableCardNav
          />
          <Link
            href={`/lyric-back?postId=${post.id}`}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 'var(--margo-touch-min)',
              fontFamily: font, fontSize: '0.6rem', fontWeight: 700,
              letterSpacing: '1.5px', textTransform: 'uppercase',
              color: 'var(--bg)', background: 'var(--gold)',
              borderRadius: '50px', textDecoration: 'none',
            }}
          >
            Lyric Back
          </Link>

          {echoes.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <p style={{
                fontFamily: font, fontSize: '0.6rem', fontWeight: 700,
                letterSpacing: '1.5px', textTransform: 'uppercase',
                color: 'var(--text-muted)', marginBottom: '12px',
              }}>
                Lyric Backs
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {echoes.map(e => {
                  const p = echoToPost(e)
                  return (
                    <PostCard
                      key={p.id}
                      variant="compact"
                      post={p}
                      resonated={resonated.has(p.id)}
                      resonateCount={resonateCounts[p.id] ?? p.resonates ?? 0}
                      echoCount={p.replies ?? 0}
                      onResonate={toggleResonate}
                      onExport={handleExport}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <CardExportModal
        open={!!exportPost}
        onOpenChange={(o) => { if (!o) setExportPost(null) }}
        moment={exportPost ? resolveMargoMomentFromPost(exportPost) : null}
      />
    </main>
  )
}
