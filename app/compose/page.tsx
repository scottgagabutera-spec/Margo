'use client'

import { useState, useCallback } from 'react'
import { Search, Music2, Disc3 } from 'lucide-react'
import { MargoNav } from '@/components/margo-nav'
import { db } from '@/lib/firebase'
import { ref, push, serverTimestamp } from 'firebase/database'
import { useUsername } from '@/hooks/useUsername'
import { cn } from '@/lib/utils'

type Source = 'genius' | 'apple'

interface SearchResult {
  id: string
  title: string
  artist: string
  artwork: string
  source: Source
}

type Vibe = 'LOVE' | 'HEARTBREAK' | 'HOPE' | 'NOSTALGIA' | 'HEALING' | 'JOY' | 'RAGE' | 'LONELINESS' | 'SEND IT' | 'LET OUT'

const VIBES: Vibe[] = ['LOVE', 'HEARTBREAK', 'HOPE', 'NOSTALGIA', 'HEALING', 'JOY', 'RAGE', 'LONELINESS', 'SEND IT', 'LET OUT']

// Mock search results
const mockResults: SearchResult[] = [
  { id: '1', title: 'All Too Well', artist: 'Taylor Swift', artwork: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop', source: 'genius' },
  { id: '2', title: 'Motion Sickness', artist: 'Phoebe Bridgers', artwork: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=100&h=100&fit=crop', source: 'genius' },
  { id: '3', title: 'Ivy', artist: 'Frank Ocean', artwork: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=100&h=100&fit=crop', source: 'apple' },
  { id: '4', title: 'Liability', artist: 'Lorde', artwork: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=100&h=100&fit=crop', source: 'apple' },
  { id: '5', title: 'The Night We Met', artist: 'Lord Huron', artwork: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=100&h=100&fit=crop', source: 'apple' },
]

export default function ComposePage() {
  const { username } = useUsername()
  const [step, setStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [selectedSong, setSelectedSong] = useState<SearchResult | null>(null)
  const [artistName, setArtistName] = useState('')
  const [songName, setSongName] = useState('')
  const [lyric, setLyric] = useState('')
  const [selectedVibe, setSelectedVibe] = useState<Vibe | null>(null)

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value)
    setShowResults(value.length > 0)
  }, [])

  const handleSelectSong = useCallback((result: SearchResult) => {
    setSelectedSong(result)
    setArtistName(result.artist)
    setSongName(result.title)
    setShowResults(false)
    setStep(2)
  }, [])

  const handleLyricComplete = useCallback(() => {
    if (lyric.trim().length > 0) {
      setStep(3)
    }
  }, [lyric])

  const handleVibeSelect = useCallback((vibe: Vibe) => {
    setSelectedVibe(vibe)
    setStep(4)
  }, [])

  const handlePost = useCallback(async (isPrivate: boolean) => {
    if (!db || !lyric || !songName || !artistName || !selectedVibe) return
    const post = {
      text: lyric,
      emotion: selectedVibe,
      mode: 'share',
      community: selectedVibe,
      status: isPrivate ? 'private' : 'active',
      flagCount: 0,
      knowledge: {
        song: songName,
        artist: artistName,
        artwork: selectedSong?.artwork || null,
        artworkFull: null,
        geniusId: selectedSong?.id || null,
        album: null,
        releaseDate: null,
        featuredArtists: [],
        writers: [],
        producers: [],
      },
      youtubeMeta: null,
      links: { spotify: null, apple: null, youtube: null, soundcloud: null },
      authorId: null,
      username: username || null,
      timestamp: serverTimestamp(),
      lang: navigator.language.split('-')[0] || 'en',
      country: navigator.language.split('-')[1] || null,
    }
    try {
      await push(ref(db, 'posts'), post)
    } catch (e) {
      console.error('Failed to post:', e)
    }
    setStep(1)
    setSearchQuery('')
    setSelectedSong(null)
    setArtistName('')
    setSongName('')
    setLyric('')
    setSelectedVibe(null)
  }, [artistName, songName, lyric, selectedVibe, selectedSong, username])

  return (
    <main className="min-h-screen relative">
      <MargoNav />
      
      {/* Ambient glows */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-64 h-64 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          {/* Step 1: Search */}
          <div className={cn(
            "transition-all duration-500",
            step === 1 ? "opacity-100" : "opacity-0 absolute pointer-events-none"
          )}>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-serif italic text-amber-400 mb-3">Find your lyric</h1>
              <p className="text-white/50 text-sm">Search by lyric, song, or artist</p>
            </div>

            <div className="relative">
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by lyric, song or artist..."
                  className="w-full h-16 pl-14 pr-6 bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/15 rounded-2xl text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/30 focus:ring-2 focus:ring-amber-500/10 transition-all text-lg"
                />
              </div>

              {/* Search Results */}
              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-4 bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/15 rounded-2xl overflow-hidden backdrop-blur-sm">
                  {mockResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelectSong(result)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-amber-500/10 transition-colors text-left"
                    >
                      <img
                        src={result.artwork}
                        alt={result.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{result.title}</p>
                        <p className="text-white/50 text-sm truncate">{result.artist}</p>
                      </div>
                      <span className={cn(
                        "px-2 py-1 rounded-md text-xs font-medium uppercase tracking-wide",
                        result.source === 'genius' 
                          ? "bg-yellow-500/20 text-yellow-400" 
                          : "bg-pink-500/20 text-pink-400"
                      )}>
                        {result.source === 'genius' ? (
                          <span className="flex items-center gap-1">
                            <Music2 className="w-3 h-3" />
                            Genius
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Disc3 className="w-3 h-3" />
                            Apple
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Lyric Input */}
          <div className={cn(
            "transition-all duration-500",
            step === 2 ? "opacity-100" : "opacity-0 absolute pointer-events-none"
          )}>
            <div className="text-center mb-10">
              <h1 className="text-3xl font-serif italic text-amber-400 mb-2">Set the stage</h1>
              <p className="text-white/50 text-sm">Enter the lyric that moves you</p>
            </div>

            <div className="space-y-6">
              {/* Artist & Song Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Artist</label>
                  <input
                    type="text"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    className="w-full h-12 px-4 bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/15 rounded-xl text-white focus:outline-none focus:border-amber-500/30 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Song</label>
                  <input
                    type="text"
                    value={songName}
                    onChange={(e) => setSongName(e.target.value)}
                    className="w-full h-12 px-4 bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/15 rounded-xl text-white focus:outline-none focus:border-amber-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Lyric Textarea - The Hero */}
              <div className="relative">
                <div className="bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/15 rounded-2xl p-8 relative overflow-hidden">
                  {/* Stage lighting effect */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 blur-3xl pointer-events-none" />
                  
                  <textarea
                    value={lyric}
                    onChange={(e) => setLyric(e.target.value.slice(0, 140))}
                    placeholder="Type your lyric here..."
                    rows={4}
                    className="w-full bg-transparent text-2xl font-serif italic text-amber-400 placeholder:text-amber-400/30 focus:outline-none resize-none relative z-10 text-center leading-relaxed"
                  />
                  
                  <div className="flex justify-between items-center mt-4 relative z-10">
                    <span className="text-xs text-white/30">{lyric.length}/140</span>
                    <button
                      onClick={handleLyricComplete}
                      disabled={lyric.trim().length === 0}
                      className="px-6 py-2 bg-amber-400 text-black font-medium rounded-full hover:bg-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Vibe Selector */}
          <div className={cn(
            "transition-all duration-500",
            step === 3 ? "opacity-100" : "opacity-0 absolute pointer-events-none"
          )}>
            <div className="text-center mb-10">
              <h1 className="text-3xl font-serif italic text-amber-400 mb-2">Choose the vibe</h1>
              <p className="text-white/50 text-sm">How does this lyric make you feel?</p>
            </div>

            {/* Preview Card */}
            <div className="bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/15 rounded-2xl p-6 mb-8 text-center">
              <p className="text-2xl font-serif italic text-amber-400 mb-3">&ldquo;{lyric}&rdquo;</p>
              <p className="text-white/50 text-sm">— {artistName}, {songName}</p>
            </div>

            {/* Vibe Pills */}
            <div className="flex flex-wrap justify-center gap-3">
              {VIBES.map((vibe) => (
                <button
                  key={vibe}
                  onClick={() => handleVibeSelect(vibe)}
                  className={cn(
                    "px-5 py-2.5 rounded-full border font-medium text-sm transition-all",
                    selectedVibe === vibe
                      ? "bg-amber-400 text-black border-amber-400"
                      : "border-amber-500/30 text-amber-400/80 hover:bg-amber-500/10 hover:border-amber-500/50"
                  )}
                >
                  {vibe}
                </button>
              ))}
            </div>
          </div>

          {/* Step 4: Action Buttons */}
          <div className={cn(
            "transition-all duration-500",
            step === 4 ? "opacity-100" : "opacity-0 absolute pointer-events-none"
          )}>
            <div className="text-center mb-10">
              <h1 className="text-3xl font-serif italic text-amber-400 mb-2">Ready to share?</h1>
              <p className="text-white/50 text-sm">Your lyric is set to go</p>
            </div>

            {/* Final Preview Card */}
            <div className="bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/15 rounded-2xl p-8 mb-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 blur-3xl pointer-events-none" />
              
              <p className="text-2xl font-serif italic text-amber-400 mb-4 relative z-10">&ldquo;{lyric}&rdquo;</p>
              <p className="text-white/50 text-sm mb-4 relative z-10">— {artistName}, {songName}</p>
              
              <span className="inline-block px-4 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-400 text-xs font-medium relative z-10">
                {selectedVibe}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handlePost(false)}
                className="px-8 py-3 bg-amber-400 text-black font-semibold rounded-full hover:bg-amber-300 transition-colors"
              >
                POST TO FEED
              </button>
              <button
                onClick={() => handlePost(true)}
                className="px-8 py-3 border border-amber-500/30 text-amber-400 font-semibold rounded-full hover:bg-amber-500/10 transition-colors"
              >
                KEEP PRIVATE
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
