'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { Play, Pause, Share2, ArrowLeft } from 'lucide-react'
import { CardExportModal } from '@/components/card-export-modal'
import { cn } from '@/lib/utils'
import { useSearchParams } from 'next/navigation'
import { useSong } from '@/hooks/useSong'

// Song data with lyrics
const currentSong = {
  title: 'Pink + White',
  artist: 'Frank Ocean',
  duration: 183, // seconds
  lyrics: [
    { id: 0, line: "That's the way everyday goes", start: 0, end: 8 },
    { id: 1, line: "Every time we've no control", start: 8, end: 16 },
    { id: 2, line: "If the sky is pink and white", start: 16, end: 24 },
    { id: 3, line: "If the ground is black and yellow", start: 24, end: 32 },
    { id: 4, line: "It's the same way you showed me", start: 32, end: 40 },
    { id: 5, line: "Nod my head, don't close my eyes", start: 40, end: 48 },
    { id: 6, line: "Halfway on a slow move", start: 48, end: 56 },
    { id: 7, line: "It's the same way you showed me", start: 56, end: 64 },
    { id: 8, line: "If you could fly, then you'd feel south", start: 64, end: 72 },
    { id: 9, line: "Up north's getting cold soon", start: 72, end: 80 },
    { id: 10, line: "The way it is, we're on land", start: 80, end: 88 },
    { id: 11, line: "So I'm someone to hold true", start: 88, end: 96 },
    { id: 12, line: "Keep on runnin', keep on runnin'", start: 96, end: 104 },
    { id: 13, line: "You showed me love", start: 104, end: 112 },
    { id: 14, line: "Glory from above", start: 112, end: 120 },
    { id: 15, line: "Regard my dear", start: 120, end: 128 },
    { id: 16, line: "It's all downhill from here", start: 128, end: 136 },
    { id: 17, line: "In the wake of a hurricane", start: 136, end: 144 },
    { id: 18, line: "Dark skin of a summer shade", start: 144, end: 152 },
    { id: 19, line: "Nosedive in the flood lines", start: 152, end: 160 },
    { id: 20, line: "Still afloat, I don't know why", start: 160, end: 168 },
    { id: 21, line: "Remember life, remember how it was", start: 168, end: 176 },
    { id: 22, line: "Climb trees, Michael Jackson, it was all the same", start: 176, end: 183 },
  ]
}

function PlayerContent() {
  const searchParams = useSearchParams()
  const songId = searchParams.get('id')
  const { song, lyrics: realLyrics, loading } = useSong(songId)
  const activeSong = song || currentSong
  const activeLyrics = realLyrics.length > 0 ? realLyrics : activeSong.lyrics
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [currentLyricIndex, setCurrentLyricIndex] = useState(4)
  const [showModal, setShowModal] = useState(false)

  // Find current lyric based on time
  useEffect(() => {
    const lyric = activeSong.lyrics.find(
      (l) => currentTime >= l.start && currentTime < l.end
    )
    if (lyric) {
      setCurrentLyricIndex(lyric.id)
    }
  }, [currentTime])

  // Simulate playback
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= activeSong.duration) {
            setIsPlaying(false)
            return 0
          }
          return prev + 0.1
        })
      }, 100)
    }
    return () => clearInterval(interval)
  }, [isPlaying])

  const jumpToLyric = useCallback((lyricId: number) => {
    const lyric = activeSong.lyrics.find((l) => l.id === lyricId)
    if (lyric) {
      setCurrentTime(lyric.start)
      setCurrentLyricIndex(lyricId)
      setIsPlaying(true)
    }
  }, [])

  const progress = (currentTime / activeSong.duration) * 100

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-amber-600/5 rounded-full blur-[100px]" />
      </div>

      {/* Progress Bar - Top */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="h-1 bg-white/10">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Header */}
      <header className="fixed top-6 left-0 right-0 z-40 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link 
            href="/music"
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </Link>
          
          <div className="text-center">
            <p className="text-white/90 font-medium">{activeSong.title}</p>
            <p className="text-sm text-white/40">{activeSong.artist}</p>
          </div>
          
          <div className="w-16" /> {/* Spacer for balance */}
        </div>
      </header>

      {/* Main Lyrics Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-40 relative z-10">
        {/* TAP ANY LINE hint */}
        <p className="absolute top-24 text-xs uppercase tracking-[0.2em] text-white/20">
          Tap any line to jump
        </p>

        {/* Teleprompter Lyrics */}
        <div className="w-full max-w-3xl space-y-6">
          {activeSong.lyrics.slice(
            Math.max(0, currentLyricIndex - 3),
            Math.min(activeSong.lyrics.length, currentLyricIndex + 4)
          ).map((lyric) => {
            const isCurrent = lyric.id === currentLyricIndex
            const isPast = lyric.id < currentLyricIndex
            const distance = Math.abs(lyric.id - currentLyricIndex)
            
            return (
              <button
                key={lyric.id}
                onClick={() => jumpToLyric(lyric.id)}
                className={cn(
                  "w-full text-center cursor-pointer",
                  "hover:opacity-100",
                  isCurrent ? "scale-100" : "scale-95"
                )}
                style={{
                  opacity: isCurrent ? 1 : Math.max(0.15, 0.5 - distance * 0.15),
                  transform: `translateY(${isCurrent ? 0 : (isPast ? -4 : 4)}px)`,
                  transition: 'opacity 700ms ease-in-out, transform 700ms ease-in-out'
                }}
              >
                <p 
                  className={cn(
                    "font-serif italic",
                    isCurrent 
                      ? "text-4xl md:text-6xl lg:text-7xl text-amber-400 leading-tight" 
                      : "text-2xl md:text-3xl lg:text-4xl text-white leading-relaxed",
                    isPast && "text-white/30"
                  )}
                  style={{
                    transition: 'color 700ms ease-in-out, font-size 700ms ease-in-out'
                  }}
                >
                  {lyric.line}
                </p>
              </button>
            )
          })}
        </div>
      </main>

      {/* Fixed Bottom Control Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#08070C] via-[#08070C]/95 to-transparent">
        <div className="px-6 py-6 pt-10">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-8">
            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-14 h-14 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm flex items-center justify-center hover:bg-white/10 hover:border-white/30 transition-all"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-1" />
              )}
            </button>

            {/* SHARE THIS LYRIC - Prominent */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-3 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-full transition-all duration-300 hover:scale-105"
            >
              <Share2 className="w-5 h-5" />
              Share This Lyric
            </button>
          </div>
        </div>
      </footer>

      {/* Card Export Modal */}
      <CardExportModal open={showModal} onOpenChange={setShowModal} />
    </div>
  )
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><p className="text-amber-400 font-serif italic">Loading…</p></div>}>
      <PlayerContent />
    </Suspense>
  )
}
