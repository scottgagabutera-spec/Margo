import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, query, orderByChild, limitToLast, onValue } from 'firebase/database'

export interface Post {
  id: string
  text?: string
  knowledge?: {
    song?: string
    artist?: string
  }
  vibe?: string
  username?: string
  timestamp?: number
  status?: string
}

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const postsRef = query(
      ref(db, 'posts'),
      orderByChild('timestamp'),
      limitToLast(50)
    )

    const unsubscribe = onValue(postsRef, (snapshot) => {
      const data: Post[] = []
      snapshot.forEach((child) => {
        const p = child.val()
        p.id = child.key
        if (p.status !== 'hidden') data.unshift(p)
      })
      setPosts(data)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return { posts, loading }
}
