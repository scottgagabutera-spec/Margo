'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Play, Disc3, Heart, Quote } from 'lucide-react'
import { MargoNav } from '@/components/margo-nav'
import { cn } from '@/lib/utils'
import { useSongs } from '@/hooks/useSongs'
import { useSharedLines } from '@/hooks/useSharedLines'



function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export default function MusicPage() {
  const [hoveredLyric, setHoveredLyric] = useState<string | null>(null)
  const { songs, loading } = useSongs()
  const featuredSong = songs[0] || null
  const moreSongs = songs.slice(1)
  const { lines: sharedLines, loading: linesLoading } = useSharedLines(featuredSong?.title, featuredSong?.artist)

  if (loading) return (
    <div className="min-h-screen bg-[#08070C] flex items-center justify-center">
      <MargoNav />
      <p className="text-amber-400 font-serif italic text-xl">Loading…</p>
    </div>
  )

  return (
    <div className="min-h-screen">
      <MargoNav />
      
      {/* Featured Song Hero */}
      <section className="relative h-[85vh] min-h-[600px] overflow-hidden">
        {/* Background Artwork */}
        <div className="absolute inset-0">
          <Image
            src={featuredSong?.artwork || ""}
            alt={featuredSong?.title}
            fill
            className="object-cover"
            priority
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#08070C] via-[#08070C]/80 to-[#08070C]/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#08070C]/60 via-transparent to-[#08070C]/60" />
        </div>

        {/* Content */}
        <div className="relative h-full flex flex-col justify-end px-6 pb-16 max-w-6xl mx-auto">
          {/* Song Info */}
          <div className="mb-8">
            <p className="text-white/50 text-sm uppercase tracking-widest mb-3">Featured</p>
            <h1 className="text-6xl md:text-8xl font-serif italic text-white mb-3 tracking-tight">
              {featuredSong?.title}
            </h1>
            <p className="text-2xl text-white/70 font-light">
              {featuredSong?.artist}
            </p>
          </div>

          {/* Three Metrics */}
          <div className="flex items-center gap-10 mb-10">
            <div className="flex items-center gap-3">
              <Play className="w-5 h-5 text-white/40" />
              <div>
                <p className="text-2xl font-medium text-white">{formatNumber(featuredSong?.plays || 0)}</p>
                <p className="text-xs uppercase tracking-widest text-white/40">Plays</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-white/40" />
              <div>
                <p className="text-2xl font-medium text-white">{formatNumber(featuredSong?.resonates || 0)}</p>
                <p className="text-xs uppercase tracking-widest text-white/40">Resonates</p>
              </div>
            </div>
            
            {/* Lyric Uses - Special Treatment */}
            <div className="flex items-center gap-3 pl-6 border-l border-amber-500/30">
              <Quote className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-2xl font-medium text-amber-400">{formatNumber(featuredSong?.lyricUses || 0)}</p>
                <p className="text-xs uppercase tracking-widest text-amber-400/70">Lyric Uses</p>
              </div>
            </div>
          </div>

          {/* Play Button */}
          <Link 
            href={`/music/player?id=${featuredSong?.id || ""}`}
            className="inline-flex items-center gap-3 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-full transition-all duration-300 hover:scale-105 w-fit"
          >
            <Play className="w-5 h-5 fill-current" />
            Play Now
          </Link>
        </div>
      </section>

      {/* Most Shared Lyrics */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Quote className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm uppercase tracking-widest text-white/40">
            Most Shared Lines from {featuredSong?.title}
          </h2>
        </div>

        <div className="space-y-4">
          {linesLoading && <p className="text-white/30 text-sm text-center py-8">Loading…</p>}
          {!linesLoading && sharedLines.length === 0 && <p className="text-white/30 text-sm text-center py-8 font-serif italic">No lines shared yet — be the first.</p>}
          {sharedLines.map((lyric) => (
            <Link
              key={lyric.id}
              href="/compose"
              onMouseEnter={() => setHoveredLyric(lyric.id)}
              onMouseLeave={() => setHoveredLyric(null)}
              className={cn(
                "block p-6 rounded-2xl border transition-all duration-300",
                "bg-gradient-to-r from-white/[0.02] to-transparent",
                hoveredLyric === lyric.id 
                  ? "border-amber-500/40 bg-amber-500/5" 
                  : "border-white/10 hover:border-white/20"
              )}
            >
              <div className="flex items-center justify-between gap-6">
                <p className="text-xl md:text-2xl font-serif italic text-white/90">
                  &ldquo;{lyric.line}&rdquo;
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <Quote className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400 font-medium">{lyric.uses}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Songs Grid */}
      <section className="px-6 py-16 max-w-6xl mx-auto border-t border-white/10">
        <h2 className="text-sm uppercase tracking-widest text-white/40 mb-8">
          More Songs
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {moreSongs.map((song) => (
            <Link
              key={song.id}
              href={`/music/player?id=${song.id}`}
              className="group"
            >
              <div className="relative aspect-square mb-4 rounded-xl overflow-hidden">
                <Image
                  src={song.artwork}
                  alt={song.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center">
                    <Play className="w-6 h-6 text-black fill-current ml-1" />
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-medium text-white mb-1 group-hover:text-amber-400 transition-colors">
                {song.title}
              </h3>
              <p className="text-sm text-white/50 mb-4">{song.artist}</p>

              {/* Three Metrics */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-white/40">
                  <Play className="w-3 h-3" />
                  <span>{formatNumber(song.plays || 0)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/40">
                  <Heart className="w-3 h-3" />
                  <span>{formatNumber(song.resonates || 0)}</span>
                </div>
                {/* Lyric Uses - Special */}
                <div className="flex items-center gap-1.5 text-amber-400/80">
                  <Quote className="w-3 h-3" />
                  <span className="font-medium">{formatNumber(song.lyricUses || 0)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
