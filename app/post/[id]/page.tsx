'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PostThreadLink } from '@/components/post-thread-link'
import { navigateToPostThread } from '@/lib/post-thread-nav'
import { usePost, usePostAncestors } from '@/hooks/usePost'
import { lyricBackCanReply } from '@/lib/lyric-back-depth'
import { PostCard } from '@/components/post-card'
import { LyricBackThreadRow } from '@/components/lyric-back-thread-row'
import {
  PostDetailLyricSection,
  usePostDetailLyricBack,
} from '@/components/post-detail-lyric-section'
import type { LyricBackThreadRowExtras } from '@/components/lyric-back-focus-panel'
import { CardExportModal } from '@/components/card-export-modal'
import { resolveMargoMomentFromPost } from '@/lib/moment'
import { echoToPost } from '@/lib/echo-to-post'
import type { Post } from '@/hooks/usePosts'
import type { Echo } from '@/hooks/useEchoes'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useIdentity } from '@/hooks/useIdentity'
import { createClient } from '@/lib/supabase/client'
import { useRegisterNavBack } from '@/components/nav-back'
import { usePostReplays } from '@/hooks/usePostReplays'

const supabase = createClient()

const font = 'var(--font-lora), serif'

export default function PostDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const postId = params.id || null
  const { post, loading } = usePost(postId)
  const { ancestors } = usePostAncestors(post?.parentPostId)
  const depthOffset = post?.parentPostId ? ancestors.length : 0

  const [composeOpen, setComposeOpen] = useState(false)
  const [replyCountDelta, setReplyCountDelta] = useState(0)

  useEffect(() => {
    setReplyCountDelta(0)
  }, [post?.id])

  const {
    stackApi,
    composeRef,
    sectionRef,
    mainCardRef,
    scrollMainCardIntoView,
  } = usePostDetailLyricBack(post, depthOffset, {
    history: composeOpen,
    onExit: () => setComposeOpen(false),
  })

  const { isNested, drillInto, resetStack, requestBack, collapseToRoot } = stackApi

  useEffect(() => {
    setComposeOpen(false)
    resetStack()
  }, [postId, resetStack])

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
  const {
    replayed,
    repost,
    undoRepost,
    quoteRepost,
    countFor,
    quoteFor,
    reconcile,
  } = usePostReplays(true)
  const [detailReplayCount, setDetailReplayCount] = useState<number | undefined>(undefined)

  const openComposer = useCallback((targetId: string, echo?: Echo) => {
    if (!post?.id) return
    if (targetId === post.id) {
      collapseToRoot()
    } else if (echo) {
      drillInto(echo)
    }
    setComposeOpen(true)
  }, [collapseToRoot, drillInto, post?.id])

  const toggleMainLyricBack = useCallback(() => {
    if (!post?.id) return
    if (composeOpen && !isNested) {
      setComposeOpen(false)
      resetStack()
      scrollMainCardIntoView()
      return
    }
    collapseToRoot()
    setComposeOpen(true)
  }, [collapseToRoot, composeOpen, isNested, post?.id, resetStack, scrollMainCardIntoView])

  const handleBackOneLevel = useCallback(() => {
    requestBack()
    setComposeOpen(true)
  }, [requestBack])

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

  useEffect(() => {
    if (!post?.id) return
    const id = post.id
    let cancelled = false
    void supabase
      .from('post_stats')
      .select('replay_count')
      .eq('post_id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error || !data) return
        const count = data.replay_count ?? 0
        setDetailReplayCount(count)
        reconcile({ [id]: count })
      })
    return () => { cancelled = true }
  }, [post?.id, reconcile])

  const replayBase = (id: string) =>
    countFor(id, id === post?.id ? detailReplayCount : undefined, 0)

  useRegisterNavBack({
    preferHistory: true,
    fallbackHref: '/feed',
    replace: true,
    onBack: () => {
      if (composeOpen) {
        setComposeOpen(false)
        resetStack()
        scrollMainCardIntoView()
        return true
      }
      return false
    },
  })

  const isLyricBack = Boolean(post?.parentPostId)
  const rootMoment = ancestors[0] ?? null

  const getRowExtras = useCallback((echo: Echo): LyricBackThreadRowExtras => ({
    onResonate: toggleResonate,
    onLyricBack: () => openComposer(echo.id, echo),
    onOpenThread: (id) => navigateToPostThread(router, id),
    onExport: handleExportEcho,
    onReplay: (id) => repost(id, replayBase(id)),
    onQuoteReplay: (id, note) => quoteRepost(id, note, replayBase(id)),
    onUndoReplay: (id) => undoRepost(id, replayBase(id)),
    replayed: replayed.has(echo.id),
    replayCount: replayBase(echo.id),
    replayNote: quoteFor(echo.id),
    resonated: resonated.has(echo.id),
    resonateCount: resonateCounts[echo.id] ?? echo.resonateCount ?? 0,
  }), [countFor, detailReplayCount, openComposer, post?.id, quoteFor, quoteRepost, replayed, repost, resonateCounts, resonated, router, undoRepost])

  const echoCount = Math.max(0, (post?.replies ?? 0) + replyCountDelta)
  const showLbSection = Boolean(
    post?.id
    && (composeOpen || echoCount > 0 || isNested),
  )

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
            <PostThreadLink postId={rootMoment.id} className="margo-post-thread-root-compact">
              <p className="margo-post-thread-root-compact__lyric">&ldquo;{rootMoment.text}&rdquo;</p>
            </PostThreadLink>
          ) : null}

          {isLyricBack && ancestors.length > 1 ? (
            <section className="margo-post-thread-ancestors">
              {ancestors.slice(1).map((ancestor) => (
                <PostThreadLink key={ancestor.id} postId={ancestor.id} className="margo-post-thread-ancestor-link">
                  {ancestor.contentRemovedAt ? (
                    <span className="margo-post-thread-ancestor-lyric">Unavailable</span>
                  ) : (
                    <>
                      <span className="margo-post-thread-ancestor-user">@{ancestor.username?.replace(/^@/, '') || 'user'}</span>
                      <span className="margo-post-thread-ancestor-lyric">&ldquo;{ancestor.text}&rdquo;</span>
                    </>
                  )}
                </PostThreadLink>
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
                  echoCount: post.replies ?? 0,
                  songId: post.songId ?? null,
                  snippetStart: post.snippetStart ?? null,
                  snippetEnd: post.snippetEnd ?? null,
                  audioUrl: post.audioUrl ?? null,
                  artwork: post.knowledge?.artwork ?? null,
                  contentRemovedAt: post.contentRemovedAt ?? null,
                }}
                isAnchor
                tone="anchor"
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
                hideLyricBackAction={!lyricBackCanReply(depthOffset)}
                lyricBackSessionActive={composeOpen && !isNested}
                onExport={() => handleExport(post)}
              />
            </section>
          ) : (
            <section ref={mainCardRef} className="margo-post-detail-main" aria-label="Lyric moment">
              <PostCard
                post={post}
                resonated={resonated.has(post.id)}
                resonateCount={resonateCounts[post.id] ?? post.resonates ?? 0}
                echoCount={echoCount}
                onResonate={toggleResonate}
                onExport={handleExport}
                onReplay={(id) => repost(id, replayBase(id))}
                onQuoteReplay={(id, note) => quoteRepost(id, note, replayBase(id))}
                onUndoReplay={(id) => undoRepost(id, replayBase(id))}
                replayed={replayed.has(post.id)}
                replayCount={replayBase(post.id)}
                replayNote={quoteFor(post.id)}
                disableCardNav
                threadDetail
                threadLyricBackOpen={composeOpen && !isNested}
                onThreadLyricBack={toggleMainLyricBack}
              />
            </section>
          )}

          {showLbSection ? (
            <PostDetailLyricSection
              key={post.id}
              post={post}
              echoCount={echoCount}
              composeOpen={composeOpen}
              composeRef={composeRef}
              sectionRef={sectionRef}
              onRequireAuth={requireAuth}
              onSent={() => {}}
              getRowExtras={getRowExtras}
              onExportEcho={handleExportEcho}
              onReplayEcho={(id) => repost(id, replayBase(id))}
              onOpenThread={(id) => navigateToPostThread(router, id)}
              onFocusEcho={(echo) => openComposer(echo.id, echo)}
              onBackOneLevel={handleBackOneLevel}
              stackApi={stackApi}
              onEchoCountDelta={(delta) => {
                setReplyCountDelta((d) => Math.max(0, d + delta))
              }}
            />
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
