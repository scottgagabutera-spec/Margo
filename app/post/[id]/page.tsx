'use client'

import { useCallback, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePost, usePostAncestors } from '@/hooks/usePost'
import { useEchoes } from '@/hooks/useEchoes'
import { useLyricBackFocusStack } from '@/hooks/useLyricBackFocusStack'
import { PostCard } from '@/components/post-card'
import { LyricBackThreadRow } from '@/components/lyric-back-thread-row'
import {
  LyricBackFocusBody,
  type LyricBackThreadRowExtras,
} from '@/components/lyric-back-focus-panel'
import {
  type LyricBackPanelComposeHandle,
} from '@/components/lyric-back-panel-compose'
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
  const { echoes, refetch: refetchEchoes } = useEchoes(postId)
  const composeRef = useRef<LyricBackPanelComposeHandle>(null)
  const lbSectionRef = useRef<HTMLElement>(null)
  const [composeOpen, setComposeOpen] = useState(false)

  const rootAuthor = post?.username ?? ''
  const {
    focusId,
    focusedEcho,
    isNested,
    backToHandle,
    replyToUsername,
    drillInto,
    backOneLevel,
    resetStack,
  } = useLyricBackFocusStack(post?.id ?? '', rootAuthor)

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
  const [replayed, setReplayed] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const saved = localStorage.getItem('margoReplayed')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  const [replayCounts, setReplayCounts] = useState<Record<string, number>>({})

  const scrollComposeIntoView = useCallback(() => {
    window.setTimeout(() => {
      lbSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      composeRef.current?.scrollIntoView()
      composeRef.current?.focusSearch()
    }, 60)
  }, [])

  const openComposer = useCallback((targetId: string, echo?: Echo) => {
    if (!post?.id) return
    if (targetId === post.id) {
      resetStack()
    } else if (echo) {
      drillInto(echo)
    }
    setComposeOpen(true)
    scrollComposeIntoView()
  }, [drillInto, post?.id, resetStack, scrollComposeIntoView])

  const toggleMainLyricBack = useCallback(() => {
    if (!post?.id) return
    if (composeOpen && !isNested) {
      setComposeOpen(false)
      resetStack()
      return
    }
    resetStack()
    openComposer(post.id)
  }, [composeOpen, isNested, openComposer, post?.id, resetStack])

  const handleBackOneLevel = useCallback(() => {
    backOneLevel()
    setComposeOpen(true)
    scrollComposeIntoView()
  }, [backOneLevel, scrollComposeIntoView])

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

  const toggleReplay = async (id: string) => {
    if (!requireAuth()) return
    if (!user?.id) return
    const myId = user.id
    const already = replayed.has(id)
    setReplayed(prev => {
      const next = new Set(prev)
      already ? next.delete(id) : next.add(id)
      try { localStorage.setItem('margoReplayed', JSON.stringify([...next])) } catch {}
      return next
    })
    setReplayCounts(prev => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + (already ? -1 : 1)) }))
    try {
      if (already) {
        const { error } = await supabase.from('post_replays').delete().eq('post_id', id).eq('replayer_id', myId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('post_replays').insert({ post_id: id, replayer_id: myId, quote_text: null })
        if (error) throw error
      }
    } catch {
      setReplayed(prev => {
        const next = new Set(prev)
        already ? next.add(id) : next.delete(id)
        return next
      })
      setReplayCounts(prev => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + (already ? 1 : -1)) }))
    }
  }

  useRegisterNavBack({
    preferHistory: !post?.parentPostId,
    fallbackHref: post?.parentPostId ? `/post/${post.parentPostId}` : '/feed',
  })

  const isLyricBack = Boolean(post?.parentPostId)
  const rootMoment = ancestors[0] ?? null

  const getRowExtras = useCallback((echo: Echo): LyricBackThreadRowExtras => ({
    onResonate: toggleResonate,
    onLyricBack: (targetId) => openComposer(targetId, echo),
    onOpenThread: (id) => router.push(`/post/${id}`),
    onExport: handleExportEcho,
    onReplay: toggleReplay,
    replayed: replayed.has(echo.id),
    replayCount: replayCounts[echo.id] ?? 0,
    resonated: resonated.has(echo.id),
    resonateCount: resonateCounts[echo.id] ?? echo.resonateCount ?? 0,
  }), [openComposer, replayCounts, replayed, resonateCounts, resonated, router])

  const echoCount = post?.replies ?? echoes.length
  const showLbSection = Boolean(post?.id && (composeOpen || echoes.length > 0 || isNested))

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
          {isLyricBack && rootMoment ? (
            <Link href={`/post/${rootMoment.id}`} className="margo-post-thread-root-compact">
              <p className="margo-post-thread-root-compact__lyric">&ldquo;{rootMoment.text}&rdquo;</p>
            </Link>
          ) : null}

          {isLyricBack && ancestors.length > 1 ? (
            <section className="margo-post-thread-ancestors">
              {ancestors.slice(1).map((ancestor) => (
                <Link key={ancestor.id} href={`/post/${ancestor.id}`} className="margo-post-thread-ancestor-link">
                  <span className="margo-post-thread-ancestor-user">@{ancestor.username?.replace(/^@/, '') || 'user'}</span>
                  <span className="margo-post-thread-ancestor-lyric">&ldquo;{ancestor.text}&rdquo;</span>
                </Link>
              ))}
            </section>
          ) : null}

          {isLyricBack ? (
            <section>
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
                tone="anchor"
                hideLyricBackAction
                {...getRowExtras({
                  id: post.id,
                  lyric: post.text || '',
                  song: post.knowledge?.song || '',
                  artist: post.knowledge?.artist || '',
                  emotion: post.emotion || '',
                  username: post.username || '',
                  timestamp: post.timestamp ?? 0,
                  resonateCount: post.resonates ?? 0,
                } as Echo)}
                onExport={() => handleExport(post)}
              />
            </section>
          ) : (
            <section className="margo-post-detail-main" aria-label="Lyric moment">
              <PostCard
                post={post}
                resonated={resonated.has(post.id)}
                resonateCount={resonateCounts[post.id] ?? post.resonates ?? 0}
                echoCount={echoCount}
                onResonate={toggleResonate}
                onExport={handleExport}
                onReplay={toggleReplay}
                replayed={replayed.has(post.id)}
                replayCount={replayCounts[post.id] ?? 0}
                disableCardNav
                threadDetail
                threadLyricBackOpen={composeOpen && !isNested}
                onThreadLyricBack={toggleMainLyricBack}
              />
            </section>
          )}

          {showLbSection && post.id ? (
            <section
              ref={lbSectionRef}
              className={`margo-post-detail-lb${isNested ? ' margo-post-detail-lb--thread-focus' : ''}`}
              aria-label="Lyric Backs"
            >
              <LyricBackFocusBody
                variant="post-inline"
                rootPostId={post.id}
                focusId={focusId}
                focusedEcho={focusedEcho}
                backToHandle={backToHandle}
                replyToUsername={replyToUsername}
                parentEmotion={post.emotion || 'chill'}
                echoCountHint={echoCount}
                composeOpen={composeOpen}
                composeRef={composeRef}
                onRequireAuth={requireAuth}
                composePrefill={null}
                onSent={() => {
                  void refetchEchoes()
                }}
                onBack={isNested ? handleBackOneLevel : undefined}
                onFocusEcho={(echo) => openComposer(echo.id, echo)}
                onOpenThread={(id) => router.push(`/post/${id}`)}
                onExportEcho={handleExportEcho}
                onReplayEcho={toggleReplay}
                getRowExtras={getRowExtras}
                echoesActive
              />
            </section>
          ) : null}
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
