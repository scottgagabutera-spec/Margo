'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useIdentity } from '@/hooks/useIdentity'
import {
  applyLoadedMembership,
  endReplayWrite,
  isUniqueViolation,
  readReplayedIds,
  reconcileReplayPending,
  tryBeginReplayWrite,
  visibleReplayCount,
  writeReplayedIds,
  type ReplayCountPending,
  type ReplayWriteKind,
} from '@/lib/repost-count'

const supabase = createClient()

export const REPOST_TOAST = {
  done: 'Reposted',
  removed: 'Repost removed',
  already: 'Already reposted',
} as const

/**
 * The signed-in user's post_replays rows.
 * Plain repost, note (quote_text), and undo. No notification and no Lyric Back.
 * localStorage key stays margoReplayed; the database is the source of truth after load.
 */
export function usePostReplays(enabled = true) {
  const { user } = useIdentity()
  const { requireAuth } = useAuthGate()
  const [replayed, setReplayed] = useState<Set<string>>(readReplayedIds)
  const [pending, setPending] = useState<Record<string, ReplayCountPending>>({})
  const [quotes, setQuotes] = useState<Record<string, string | null>>({})
  const quotesRef = useRef(quotes)
  quotesRef.current = quotes
  const replayedRef = useRef(replayed)
  const inFlightRef = useRef(new Map<string, ReplayWriteKind>())
  const genRef = useRef(0)
  const loadedAtRef = useRef(0)
  /** Local membership chosen after a load request started. Stale selects must not undo it. */
  const decidedAtRef = useRef(new Map<string, number>())
  replayedRef.current = replayed

  const commit = useCallback((next: Set<string>, touchedId?: string) => {
    if (touchedId) decidedAtRef.current.set(touchedId, Date.now())
    replayedRef.current = next
    setReplayed(next)
    writeReplayedIds(next)
  }, [])

  useEffect(() => {
    if (!enabled || !user?.id) return
    const myId = user.id
    let cancelled = false

    async function loadMine() {
      const started = Date.now()
      const { data, error } = await supabase
        .from('post_replays')
        .select('post_id, quote_text')
        .eq('replayer_id', myId)
      if (cancelled) return
      if (error) {
        console.error('Failed to load replays:', error)
        return
      }
      const rows = data || []
      const loaded = rows.map((row) => row.post_id as string)
      const fromServer: Record<string, string | null> = {}
      for (const row of rows) fromServer[row.post_id as string] = (row.quote_text as string | null) ?? null
      for (const [id, at] of decidedAtRef.current) {
        if (at >= started && Object.prototype.hasOwnProperty.call(quotesRef.current, id)) {
          fromServer[id] = quotesRef.current[id]
        }
      }
      quotesRef.current = fromServer
      setQuotes(fromServer)
      const applied = applyLoadedMembership(
        loaded,
        inFlightRef.current,
        decidedAtRef.current,
        replayedRef.current,
        started,
      )
      for (const id of applied.dropDecided) decidedAtRef.current.delete(id)
      commit(applied.ids)
      loadedAtRef.current = Date.now()
    }

    const neverLoaded = loadedAtRef.current === 0
    const stale = Date.now() - loadedAtRef.current > 60_000
    if (neverLoaded || stale) void loadMine()

    let channel: ReturnType<typeof supabase.channel> | null = null
    try {
      const next = supabase.channel(`my-post-replays:${crypto.randomUUID()}`)
      next.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_replays', filter: `replayer_id=eq.${myId}` },
        () => { if (!cancelled) void loadMine() },
      )
      next.subscribe()
      channel = next
    } catch (err) {
      console.error('post_replays realtime failed', err)
    }

    return () => {
      cancelled = true
      if (channel) void supabase.removeChannel(channel)
    }
  }, [commit, enabled, user?.id])

  const rememberQuote = useCallback((postId: string, text: string | null) => {
    const next = { ...quotesRef.current, [postId]: text }
    quotesRef.current = next
    setQuotes(next)
  }, [])

  const quoteFor = useCallback((postId: string) => quotes[postId] ?? null, [quotes])

  const countFor = useCallback((
    postId: string,
    server: number | undefined,
    fallback = 0,
  ) => visibleReplayCount(server, pending[postId], fallback), [pending])

  const reconcile = useCallback((serverById: Record<string, number | undefined>) => {
    setPending((prev) => reconcileReplayPending(prev, serverById))
  }, [])

  const finish = useCallback((postId: string, gen: number, settle: boolean) => {
    endReplayWrite(inFlightRef.current, postId)
    setPending((prev) => {
      const row = prev[postId]
      if (!row || row.gen !== gen) return prev
      if (!settle) {
        const next = { ...prev }
        delete next[postId]
        return next
      }
      return { ...prev, [postId]: { ...row, settled: true } }
    })
  }, [])

  const repost = useCallback(async (postId: string, base: number): Promise<boolean> => {
    if (!requireAuth()) return true
    if (!user?.id) return true
    if (replayedRef.current.has(postId)) {
      toast(REPOST_TOAST.already)
      return true
    }
    if (!tryBeginReplayWrite(inFlightRef.current, postId, 'insert')) return true
    const myId = user.id
    const gen = ++genRef.current
    const added = new Set(replayedRef.current)
    added.add(postId)
    commit(added, postId)
    rememberQuote(postId, null)
    setPending((prev) => ({
      ...prev,
      [postId]: { base, delta: 1, settled: false, gen },
    }))
    try {
      const { error } = await supabase.from('post_replays').insert({
        post_id: postId,
        replayer_id: myId,
        quote_text: null,
      })
      if (error) {
        if (isUniqueViolation(error)) {
          toast(REPOST_TOAST.already)
          finish(postId, gen, false)
          return true
        }
        throw error
      }
      toast(REPOST_TOAST.done)
      finish(postId, gen, true)
      return true
    } catch (err) {
      console.error('Failed to replay:', err)
      const next = new Set(replayedRef.current)
      next.delete(postId)
      commit(next, postId)
      finish(postId, gen, false)
      return false
    }
  }, [commit, finish, rememberQuote, requireAuth, user?.id])

  const undoRepost = useCallback(async (postId: string, base: number): Promise<boolean> => {
    if (!requireAuth()) return true
    if (!user?.id) return true
    if (!replayedRef.current.has(postId)) return true
    if (!tryBeginReplayWrite(inFlightRef.current, postId, 'delete')) return true
    const myId = user.id
    const gen = ++genRef.current
    const next = new Set(replayedRef.current)
    next.delete(postId)
    commit(next, postId)
    const previousNote = quotesRef.current[postId] ?? null
    rememberQuote(postId, null)
    setPending((prev) => ({
      ...prev,
      [postId]: { base, delta: -1, settled: false, gen },
    }))
    try {
      const { error } = await supabase
        .from('post_replays')
        .delete()
        .eq('post_id', postId)
        .eq('replayer_id', myId)
      if (error) throw error
      toast(REPOST_TOAST.removed)
      finish(postId, gen, true)
      return true
    } catch (err) {
      console.error('Failed to un-replay:', err)
      const restored = new Set(replayedRef.current)
      restored.add(postId)
      commit(restored, postId)
      rememberQuote(postId, previousNote)
      finish(postId, gen, false)
      return false
    }
  }, [commit, finish, rememberQuote, requireAuth, user?.id])

  const quoteRepost = useCallback(async (postId: string, quoteText: string, base: number): Promise<boolean> => {
    if (!requireAuth()) return true
    if (!user?.id) return true
    const text = quoteText.trim()
    if (!text) return false
    if (!tryBeginReplayWrite(inFlightRef.current, postId, 'quote')) return true
    const myId = user.id
    const already = replayedRef.current.has(postId)
    const gen = ++genRef.current
    const previousNote = quotesRef.current[postId] ?? null
    rememberQuote(postId, text)
    if (!already) {
      const added = new Set(replayedRef.current)
      added.add(postId)
      commit(added, postId)
      setPending((prev) => ({
        ...prev,
        [postId]: { base, delta: 1, settled: false, gen },
      }))
    }
    try {
      if (already) {
        const { error } = await supabase
          .from('post_replays')
          .update({ quote_text: text })
          .eq('post_id', postId)
          .eq('replayer_id', myId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('post_replays').insert({
          post_id: postId,
          replayer_id: myId,
          quote_text: text,
        })
        if (error) {
          if (isUniqueViolation(error)) {
            const { error: updateError } = await supabase
              .from('post_replays')
              .update({ quote_text: text })
              .eq('post_id', postId)
              .eq('replayer_id', myId)
            if (updateError) throw updateError
            toast(REPOST_TOAST.done)
            finish(postId, gen, false)
            return true
          }
          throw error
        }
      }
      toast(REPOST_TOAST.done)
      finish(postId, gen, !already)
      return true
    } catch (err) {
      console.error('Failed to quote-replay:', err)
      if (!already) {
        const next = new Set(replayedRef.current)
        next.delete(postId)
        commit(next, postId)
      }
      rememberQuote(postId, previousNote)
      finish(postId, gen, false)
      return false
    }
  }, [commit, finish, rememberQuote, requireAuth, user?.id])

  return { replayed, repost, undoRepost, quoteRepost, countFor, quoteFor, reconcile }
}
