'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Play, Disc3, Heart, Quote } from 'lucide-react'
import { MargoNav } from '@/components/margo-nav'
import { cn } from '@/lib/utils'

// Featured song data
const featuredSong = {
  id: '1',
  title: 'Pink + White',
  artist: 'Frank Ocean',
  album: 'Blonde',
  artwork: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&h=800&fit=crop',
  plays: 847293,
  resonates: 12847,
  lyricUses: 3421,
  sharedLyrics: [
    { id: '1', line: "That's the way everyday goes, every time we've no control", uses: 847 },
    { id: '2', line: "If the ground beneath you splits in two, I'd just float, I'd just float", uses: 634 },
    { id: '3', line: "You showed me love, glory from above", uses: 512 },
    { id: '4', line: "Keep on runnin', keep on runnin'", uses: 428 },
    { id: '5', line: "Remember life, remember how it was", uses: 387 },
  ]
}

// Songs grid data
const songs = [
  {
    id: '2',
    title: 'Self Control',
    artist: 'Frank Ocean',
    artwork: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
    plays: 623847,
    resonates: 9823,
    lyricUses: 2847,
  },
  {
    id: '3',
    title: 'Ivy',
    artist: 'Frank Ocean',
    artwork: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop',
    plays: 521938,
    resonates: 8234,
    lyricUses: 2156,
  },
  {
    id: '4',
    title: 'Nights',
    artist: 'Frank Ocean',
    artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop',
    plays: 892147,
    resonates: 14523,
    lyricUses: 4892,
  },
  {
    id: '5',
    title: 'White Ferrari',
    artist: 'Frank Ocean',
    artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop',
    plays: 445623,
    resonates: 7892,
    lyricUses: 1934,
  },
  {
    id: '6',
    title: 'Godspeed',
    artist: 'Frank Ocean',
    artwork: 'https://images.unsplash.com/photo-1446057032654-9d8885db76c6?w=400&h=400&fit=crop',
    plays: 378234,
    resonates: 6234,
    lyricUses: 1623,
  },
  {
    id: '7',
    title: 'Solo',
    artist: 'Frank Ocean',
    artwork: 'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=400&h=400&fit=crop',
    plays: 534892,
    resonates: 8934,
    lyricUses: 2345,
  },
]

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

  return (
    <div className="min-h-screen">
      <MargoNav />
      
      {/* Featured Song Hero */}
      <section className="relative h-[85vh] min-h-[600px] overflow-hidden">
        {/* Background Artwork */}
        <div className="absolute inset-0">
          <Image
            src={featuredSong.artwork}
            alt={featuredSong.title}
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
              {featuredSong.title}
            </h1>
            <p className="text-2xl text-white/70 font-light">
              {featuredSong.artist}
            </p>
          </div>

          {/* Three Metrics */}
          <div className="flex items-center gap-10 mb-10">
            <div className="flex items-center gap-3">
              <Play className="w-5 h-5 text-white/40" />
              <div>
                <p className="text-2xl font-medium text-white">{formatNumber(featuredSong.plays)}</p>
                <p className="text-xs uppercase tracking-widest text-white/40">Plays</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-white/40" />
              <div>
                <p className="text-2xl font-medium text-white">{formatNumber(featuredSong.resonates)}</p>
                <p className="text-xs uppercase tracking-widest text-white/40">Resonates</p>
              </div>
            </div>
            
            {/* Lyric Uses - Special Treatment */}
            <div className="flex items-center gap-3 pl-6 border-l border-amber-500/30">
              <Quote className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-2xl font-medium text-amber-400">{formatNumber(featuredSong.lyricUses)}</p>
                <p className="text-xs uppercase tracking-widest text-amber-400/70">Lyric Uses</p>
              </div>
            </div>
          </div>

          {/* Play Button */}
          <Link 
            href="/music/player"
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
            Most Shared Lines from {featuredSong.title}
          </h2>
        </div>

        <div className="space-y-4">
          {featuredSong.sharedLyrics.map((lyric) => (
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
          {songs.map((song) => (
            <Link
              key={song.id}
              href="/music/player"
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
                  <span>{formatNumber(song.plays)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/40">
                  <Heart className="w-3 h-3" />
                  <span>{formatNumber(song.resonates)}</span>
                </div>
                {/* Lyric Uses - Special */}
                <div className="flex items-center gap-1.5 text-amber-400/80">
                  <Quote className="w-3 h-3" />
                  <span className="font-medium">{formatNumber(song.lyricUses)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
