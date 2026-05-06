'use client'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { Post } from '@/hooks/usePosts'

export function usePost(postId: string | null) {
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !postId) { setLoading(false); return }
    const postRef = ref(db, `posts/${postId}`)
    const unsub = onValue(postRef, (snap) => {
      if (snap.exists()) {
        setPost({ ...snap.val(), id: snap.key })
      }
      setLoading(false)
    })
    return () => unsub()
  }, [postId])

  return { post, loading }
}
