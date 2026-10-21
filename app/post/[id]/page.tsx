'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePost, usePostAncestors } from '@/hooks/usePost'
import { useEchoes } from '@/hooks/useEchoes'
import { PostCard } from '@/components/post-card'
import { LyricBackThreadRow } from '@/components/lyric-back-thread-row'
import { CardExportModal } from '@/components/card-export-modal'
import { resolveMargoMomentFromPost } from '@/lib/moment'
import { echoToPost } from '@/lib/echo-to-post'
import type { Post } from '@/hooks/usePosts'
import type { Echo } from '@/hooks/useEchoes'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useIdentity } from '@/hooks/useIdentity'
import { createClient } from '@/lib/supabase/client'
import { useRegisterNavBack } from '@/components/nav-back'

const supabase = createClient()

const font = 'var(--font-lora), serif'

export default function PostDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const postId = params.id || null
  const { post, loading } = usePost(postId)
  const { ancestors } = usePostAncestors(post?.parentPostId)
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

  useEffect(() => {
    if (ancestors.length === 0) return
    setResonateCounts(prev => {
      const next = { ...prev }
      for (const ancestor of ancestors) {
        if (next[ancestor.id] == null) next[ancestor.id] = ancestor.resonates ?? 0
      }
      return next
    })
  }, [ancestors])

  useEffect(() => {
    for (const e of echoes) {
      setResonateCounts(prev => ({
        ...prev,
        [e.id]: prev[e.id] ?? e.resonateCount ?? 0,
      }))
    }
  }, [echoes])

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

  const handleExportEcho = (echo: Echo) => handleExport(echoToPost(echo))

  useRegisterNavBack({
    preferHistory: !post?.parentPostId,
    fallbackHref: post?.parentPostId ? `/post/${post.parentPostId}` : '/feed',
  })

  const isLyricBack = Boolean(post?.parentPostId)

  return (
    <main style={{
      minHeight: '100vh', background: 'var(--bg)',
      padding: 'calc(var(--nav-height, 72px) + 24px) 20px var(--margo-page-padding-bottom)',
      maxWidth: '640px', margin: '0 auto',
    }}>

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {ancestors.length > 0 && (
            <section className="margo-post-thread-ancestors">
              <p className="margo-post-thread-section-label">Earlier in this thread</p>
              {ancestors.map((ancestor) => (
                <Link key={ancestor.id} href={`/post/${ancestor.id}`} className="margo-post-thread-ancestor-link">
                  <span className="margo-post-thread-ancestor-user">@{ancestor.username?.replace(/^@/, '') || 'user'}</span>
                  <span className="margo-post-thread-ancestor-lyric">&ldquo;{ancestor.text}&rdquo;</span>
                </Link>
              ))}
            </section>
          )}

          {isLyricBack ? (
            <section>
              <p className="margo-post-thread-section-label">You&apos;re viewing</p>
              <LyricBackThreadRow
                echo={{
                  id: post.id,
                  lyric: post.text || '',
                  song: post.knowledge?.song || '',
                  artist: post.knowledge?.artist || '',
                  emotion: post.emotion || '',
                  username: post.username || '',
                  displayName: post.authorDisplayName ?? undefined,
                  authorUid: post.authorUid ?? undefined,
                  authorAvatarUrl: post.authorAvatarUrl,
                  timestamp: post.timestamp ?? 0,
                  resonateCount: resonateCounts[post.id] ?? post.resonates ?? 0,
                  echoCount: post.replies ?? echoes.length,
                  songId: post.songId ?? null,
                  snippetStart: post.snippetStart ?? null,
                  snippetEnd: post.snippetEnd ?? null,
                  audioUrl: post.audioUrl ?? null,
                  artwork: post.knowledge?.artwork ?? null,
                }}
                isAnchor
                resonated={resonated.has(post.id)}
                resonateCount={resonateCounts[post.id] ?? post.resonates ?? 0}
                onResonate={toggleResonate}
                onOpenThread={(id) => router.push(`/post/${id}`)}
                onExport={() => handleExport(post)}
                onLyricBack={() => {
                  if (!requireAuth()) return
                  router.push(`/lyric-back?echoId=${encodeURIComponent(post.id)}`)
                }}
              />
            </section>
          ) : (
            <section>
              <p className="margo-post-thread-section-label">Original moment</p>
              <PostCard
                post={post}
                resonated={resonated.has(post.id)}
                resonateCount={resonateCounts[post.id] ?? post.resonates ?? 0}
                echoCount={post.replies ?? echoes.length}
                onResonate={toggleResonate}
                onExport={handleExport}
                disableCardNav
                threadDetail
              />
            </section>
          )}

          {echoes.length > 0 && (
            <section>
              <p className="margo-post-thread-section-label">
                Lyric Backs on {isLyricBack ? 'this reply' : 'this moment'}
              </p>
              <ul className="margo-post-thread-list">
                {echoes.map((e) => (
                  <li key={e.id}>
                    <LyricBackThreadRow
                      echo={e}
                      resonated={resonated.has(e.id)}
                      resonateCount={resonateCounts[e.id] ?? e.resonateCount ?? 0}
                      onResonate={toggleResonate}
                      onOpenThread={(id) => router.push(`/post/${id}`)}
                      onExport={handleExportEcho}
                      onLyricBack={(id) => {
                        if (!requireAuth()) return
                        router.push(`/lyric-back?echoId=${encodeURIComponent(id)}`)
                      }}
                    />
                  </li>
                ))}
              </ul>
            </section>
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
