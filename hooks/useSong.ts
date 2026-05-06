'use client'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { Song } from '@/hooks/useSongs'

export interface LyricLine {
  id: number
  line: string
  start: number
  end: number
}

function parseSRT(srt: string): LyricLine[] {
  const blocks = srt.trim().split(/\n\s*\n/)
  const lines: LyricLine[] = []
  blocks.forEach((block, i) => {
    const parts = block.trim().split('\n')
    if (parts.length < 3) return
    const timePart = parts[1]
    const match = timePart.match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    )
    if (!match) return
    const toSec = (h: string, m: string, s: string, ms: string) =>
      parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000
    const start = toSec(match[1], match[2], match[3], match[4])
    const end = toSec(match[5], match[6], match[7], match[8])
    const line = parts.slice(2).join(' ').trim()
    lines.push({ id: i, line, start, end })
  })
  return lines
}

function parsePlainLyrics(lyrics: string): LyricLine[] {
  return lyrics
    .split('\n')
    .filter(l => l.trim())
    .map((line, i) => ({ id: i, line: line.trim(), start: i * 8, end: (i + 1) * 8 }))
}

export function useSong(id: string | null) {
  const [song, setSong] = useState<Song | null>(null)
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !id) { setLoading(false); return }
    const songRef = ref(db, `songs/${id}`)
    const unsub = onValue(songRef, (snap) => {
      if (!snap.exists()) { setLoading(false); return }
      const s: Song = { ...snap.val(), id: snap.key }
      setSong(s)
      if (s.srt) {
        setLyrics(parseSRT(s.srt))
      } else if (s.lyrics) {
        setLyrics(parsePlainLyrics(s.lyrics))
      }
      setLoading(false)
    })
    return () => unsub()
  }, [id])

  return { song, lyrics, loading }
}
