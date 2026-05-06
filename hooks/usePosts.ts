'use client'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, query, orderByChild, limitToLast, onValue } from 'firebase/database'

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

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!db) { setLoading(false); return }
    const postsRef = query(ref(db, 'posts'), orderByChild('timestamp'), limitToLast(50))
    const unsubscribe = onValue(postsRef, (snapshot) => {
      const data: Post[] = []
      snapshot.forEach((child) => {
        const p = child.val()
        p.id = child.key
        if (p.status !== 'hidden' && p.status !== 'private') data.unshift(p)
      })
      setPosts(data)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])
  return { posts, loading }
}
