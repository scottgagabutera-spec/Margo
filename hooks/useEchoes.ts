'use client'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'

export interface Echo {
  id: string
  lyric: string
  song: string
  artist: string
  emotion: string
  username: string
  timestamp: number
  resonates?: Record<string, boolean>
}

export function useEchoes(postId: string | null) {
  const [echoes, setEchoes] = useState<Echo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !postId) { setLoading(false); return }
    const echoesRef = ref(db, `posts/${postId}/echoes`)
    const unsub = onValue(echoesRef, (snap) => {
      const list: Echo[] = []
      snap.forEach((child) => {
        list.push({ ...child.val(), id: child.key })
      })
      setEchoes(list.reverse())
      setLoading(false)
    })
    return () => unsub()
  }, [postId])

  return { echoes, loading }
}
