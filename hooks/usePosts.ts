'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { db } from '@/lib/firebase'
import { ref, query, orderByChild, limitToLast, onValue, off } from 'firebase/database'

export interface Post {
  id: string
  text?: string
  emotion?: string
  status?: string
  knowledge?: { song?: string; artist?: string; artwork?: string | null }
  youtubeMeta?: { videoId?: string | null; title?: string | null; thumbnail?: string | null; thumbnailSm?: string | null; channel?: string | null; youtubeUrl?: string | null; embedUrl?: string | null } | null
  username?: string | null
  timestamp?: number
  resonates?: number
  replies?: number
}

const PAGE_SIZE = 20

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const limitRef = useRef(PAGE_SIZE)

  const fetchPosts = useCallback((limit: number, isLoadMore = false) => {
    if (!db) { setLoading(false); return () => {} }

    if (isLoadMore) setLoadingMore(true)
    else setLoading(true)

    const postsRef = query(ref(db, 'posts'), orderByChild('timestamp'), limitToLast(limit))

    const handler = onValue(postsRef, (snapshot) => {
      const data: Post[] = []
      snapshot.forEach((child) => {
        const p = child.val()
        p.id = child.key
        if (p.status !== 'hidden' && p.status !== 'private') data.unshift(p)
      })
      setPosts(data)
      setHasMore(data.length >= limit)
      setLoading(false)
      setLoadingMore(false)
    })

    return () => off(postsRef, 'value', handler)
  }, [])

  useEffect(() => {
    const unsub = fetchPosts(PAGE_SIZE)
    return unsub
  }, [fetchPosts])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    limitRef.current += PAGE_SIZE
    fetchPosts(limitRef.current, true)
  }, [loadingMore, hasMore, fetchPosts])

  return { posts, loading, loadingMore, hasMore, loadMore }
}
