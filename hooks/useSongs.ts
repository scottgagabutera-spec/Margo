'use client'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, query, orderByChild, onValue } from 'firebase/database'

export interface Song {
  id: string
  title: string
  artist: string
  artwork?: string | null
  youtubeId?: string | null
  youtubeUrl?: string | null
  audiomackUrl?: string | null
  spotifyUrl?: string | null
  appleMusicUrl?: string | null
  soundcloudUrl?: string | null
  boomplayUrl?: string | null
  lyrics?: string | null
  srt?: string | null
  description?: string | null
  tags?: string[]
  order?: number
  status?: string
  comingSoonLabel?: string | null
  plays?: number
  resonates?: number
  lyricUses?: number
  createdAt?: number
  updatedAt?: number
}

export function useSongs() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) { setLoading(false); return }
    const songsRef = query(ref(db, 'songs'), orderByChild('order'))
    const unsub = onValue(songsRef, (snap) => {
      const list: Song[] = []
      snap.forEach((child) => {
        const s = child.val()
        if (s.status !== 'hidden') {
          list.push({ ...s, id: child.key })
        }
      })
      setSongs(list)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  return { songs, loading }
}
