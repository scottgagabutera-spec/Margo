'use client'
import { useState, useEffect, useMemo } from 'react'
import { db } from '@/lib/firebase'
import { ref, query, orderByChild, limitToLast, onValue } from 'firebase/database'
import { useVisibleAuthorIds } from '@/hooks/useVisibleAuthorIds'

export interface Post {
  id: string
  text?: string
  emotion?: string
  status?: string
  knowledge?: { song?: string; artist?: string; artwork?: string | null }
  youtubeMeta?: { videoId?: string | null; title?: string | null; thumbnail?: string | null; thumbnailSm?: string | null; channel?: string | null; youtubeUrl?: string | null; embedUrl?: string | null } | null
  username?: string | null
  authorUid?: string | null
  authorAvatarUrl?: string | null
  timestamp?: number
  resonates?: number
  replies?: number
  songId?: string | null
  audioUrl?: string | null
}

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) { setLoading(false); return }
    const postsRef = query(ref(db, 'posts'), orderByChild('timestamp'), limitToLast(200))
    const unsub = onValue(postsRef, (snapshot) => {
      const data: Post[] = []
      snapshot.forEach((child) => {
        const p = child.val()
        p.id = child.key
        if (p.status !== 'hidden' && p.status !== 'private') data.unshift(p)
      })
      setPosts(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // Single source of truth for privacy filtering — same hook the feed
  // page and any other consumer use, scoped to only the authors present
  // in this batch rather than fetching every private profile in the app.
  // This is a display-layer fix only; it does not replace Firebase
  // security rules, which still need to enforce this at the data layer.
  const authorUids = useMemo(() => posts.map(p => p.authorUid), [posts])
  const visibleAuthorIds = useVisibleAuthorIds(authorUids)

  const visiblePosts = useMemo(() => {
    return posts.filter(p => !p.authorUid || visibleAuthorIds.has(p.authorUid))
  }, [posts, visibleAuthorIds])

  return { posts: visiblePosts, loading }
}