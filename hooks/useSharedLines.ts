'use client'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, query, orderByChild, onValue } from 'firebase/database'

export interface SharedLine {
  id: string
  line: string
  uses: number
  resonates: number
  score: number
}

function normalize(str: string) {
  return (str || '').toLowerCase().trim()
}

export function useSharedLines(song: string | null | undefined, artist: string | null | undefined) {
  const [lines, setLines] = useState<SharedLine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !song || !artist) { setLoading(false); return }

    const postsRef = query(ref(db, 'posts'), orderByChild('timestamp'))

    const unsub = onValue(postsRef, (snapshot) => {
      const counts: Record<string, { uses: number; resonates: number }> = {}

      snapshot.forEach((child) => {
        const p = child.val()
        if (p.status === 'hidden' || p.status === 'private') return
        if (!p.text) return

        const postSong = normalize(p.knowledge?.song || '')
        const postArtist = normalize(p.knowledge?.artist || '')
        const targetSong = normalize(song)
        const targetArtist = normalize(artist)

        const songMatch = postSong.includes(targetSong) || targetSong.includes(postSong)
        const artistMatch = postArtist.includes(targetArtist) || targetArtist.includes(postArtist)

        if (songMatch && artistMatch) {
          const key = p.text.trim()
          if (!counts[key]) counts[key] = { uses: 0, resonates: 0 }
          counts[key].uses += 1
          counts[key].resonates += (p.resonates || 0)
        }
      })

      const ranked: SharedLine[] = Object.entries(counts)
        .map(([line, data], i) => ({
          id: String(i),
          line,
          uses: data.uses,
          resonates: data.resonates,
          score: data.uses * 2 + data.resonates,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)

      setLines(ranked)
      setLoading(false)
    })

    return () => unsub()
  }, [song, artist])

  return { lines, loading }
}
