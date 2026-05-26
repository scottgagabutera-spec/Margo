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
  status?: string
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
        const val = { ...child.val(), id: child.key }
        if (val.status !== 'hidden') list.push(val)
      })
      setEchoes(list.reverse())
      setLoading(false)
    })
    return () => unsub()
  }, [postId])

  return { echoes, loading }
}
