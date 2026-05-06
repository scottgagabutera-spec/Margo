'use client'

import { useState, useCallback, Suspense } from 'react'
import { Search, Music2, Disc3, Heart, MessageCircle, CreditCard } from 'lucide-react'
import { MargoNav } from '@/components/margo-nav'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { db } from '@/lib/firebase'
import { useEchoes } from '@/hooks/useEchoes'
import { ref, push, serverTimestamp } from 'firebase/database'
import { useUsername } from '@/hooks/useUsername'
import { useSearchParams } from 'next/navigation'
import { usePost } from '@/hooks/usePost'

type Source = 'genius' | 'apple'

interface SearchResult {
  id: string
  title: string
  artist: string
  artwork: string
  source: Source
}

type Vibe = 'LOVE' | 'HEARTBREAK' | 'HOPE' | 'NOSTALGIA' | 'HEALING' | 'JOY' | 'RAGE' | 'LONELINESS' | 'SEND IT' | 'LET OUT'

interface LyricBack {
  id: string
  username: string
  avatar?: string
  lyric: string
  artist: string
  song: string
  vibe: Vibe
  resonanceCount: number
}

const VIBES: Vibe[] = ['LOVE', 'HEARTBREAK', 'HOPE', 'NOSTALGIA', 'HEALING', 'JOY', 'RAGE', 'LONELINESS', 'SEND IT', 'LET OUT']

// Mock search results

// Mock original lyric


function LyricBackContent() {
  const { username } = useUsername()
  const searchParams = useSearchParams()
  const postId = searchParams.get('postId')
  const { post: respondingToPost } = usePost(postId)
  const { echoes, loading: echoesLoading } = useEchoes(postId)
  const [step, setStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedSong, setSelectedSong] = useState<SearchResult | null>(null)
  const [artistName, setArtistName] = useState('')
  const [songName, setSongName] = useState('')
  const [lyric, setLyric] = useState('')
  const [selectedVibe, setSelectedVibe] = useState<Vibe | null>(null)

  const handleSearch = useCallback(async (value: string) => {
    setSearchQuery(value)
    if (value.length < 2) { setShowResults(false); setSearchResults([]); return }
    setShowResults(true)
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/genius?song=${encodeURIComponent(value)}`)
      const data = await res.json()
      setSearchResults((data.results || []).map((r: any) => ({
        id: String(r.id || r.song),
        title: r.song,
        artist: r.artist,
        artwork: r.artwork || '',
        source: r.source as 'genius' | 'apple',
      })))
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
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
      const echoData = {
        lyric: post.text,
        song: post.knowledge?.song || songName,
        artist: post.knowledge?.artist || artistName,
        emotion: post.emotion,
        username: post.username,
        timestamp: post.timestamp,
        resonates: {},
      }
      if (postId) {
        await push(ref(db, `posts/${postId}/echoes`), echoData)
      } else {
        await push(ref(db, 'posts'), post)
      }
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
          {/* Original Lyric Card - Always Visible */}
          <div className="bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/15 rounded-2xl p-6 mb-10 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-amber-500/10 blur-3xl pointer-events-none" />
            
            <p className="text-xs text-white/40 uppercase tracking-wider mb-4 relative z-10">Responding to</p>
            <p className="text-2xl font-serif italic text-amber-400 mb-3 relative z-10">&ldquo;{respondingToPost?.text || '—'}&rdquo;</p>
            <p className="text-white/50 text-sm mb-3 relative z-10">— {respondingToPost?.knowledge?.artist || ''}, {respondingToPost?.knowledge?.song || ''}</p>
            <div className="flex items-center justify-center gap-2 relative z-10">
              <span className="text-xs text-white/40">by {respondingToPost?.username || '—'}</span>
              <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-400 text-xs font-medium">
                {respondingToPost?.emotion || ''}
              </span>
            </div>
          </div>

          {/* Step 1: Search */}
          <div className={cn(
            "transition-all duration-500",
            step === 1 ? "opacity-100" : "opacity-0 absolute pointer-events-none"
          )}>
            <div className="text-center mb-10">
              <h1 className="text-3xl font-serif italic text-amber-400 mb-2">Send a lyric back</h1>
              <p className="text-white/50 text-sm">Find a lyric that resonates</p>
            </div>

            <div className="relative">
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by lyric, song or artist..."
                  className="w-full h-14 pl-14 pr-6 bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/15 rounded-2xl text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/30 focus:ring-2 focus:ring-amber-500/10 transition-all"
                />
              </div>

              {/* Search Results */}
              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-4 bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/15 rounded-2xl overflow-hidden backdrop-blur-sm z-20">
                  {searchLoading ? (<div className="text-center text-amber-400/60 text-sm py-4">Searching…</div>) : null}{searchResults.map((result) => (
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
            <div className="text-center mb-8">
              <h1 className="text-3xl font-serif italic text-amber-400 mb-2">Your reply</h1>
              <p className="text-white/50 text-sm">Enter the lyric you want to send back</p>
            </div>

            <div className="space-y-6">
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

              <div className="relative">
                <div className="bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/15 rounded-2xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 blur-3xl pointer-events-none" />
                  
                  <textarea
                    value={lyric}
                    onChange={(e) => setLyric(e.target.value.slice(0, 140))}
                    placeholder="Type your reply lyric here..."
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
            <div className="text-center mb-8">
              <h1 className="text-3xl font-serif italic text-amber-400 mb-2">Choose the vibe</h1>
              <p className="text-white/50 text-sm">How does your reply feel?</p>
            </div>

            <div className="bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/15 rounded-2xl p-6 mb-8 text-center">
              <p className="text-xl font-serif italic text-amber-400 mb-3">&ldquo;{lyric}&rdquo;</p>
              <p className="text-white/50 text-sm">— {artistName}, {songName}</p>
            </div>

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
            <div className="text-center mb-8">
              <h1 className="text-3xl font-serif italic text-amber-400 mb-2">Ready to send?</h1>
              <p className="text-white/50 text-sm">Your lyric back is set to go</p>
            </div>

            <div className="bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/15 rounded-2xl p-8 mb-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 blur-3xl pointer-events-none" />
              
              <p className="text-xl font-serif italic text-amber-400 mb-4 relative z-10">&ldquo;{lyric}&rdquo;</p>
              <p className="text-white/50 text-sm mb-4 relative z-10">— {artistName}, {songName}</p>
              
              <span className="inline-block px-4 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-400 text-xs font-medium relative z-10">
                {selectedVibe}
              </span>
            </div>

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

          {/* Existing Lyric Backs Section */}
          <div className="mt-16 pt-10 border-t border-amber-500/10">
            <h2 className="text-xl font-serif italic text-amber-400 mb-6 text-center">Lyric Backs</h2>
            
            <div className="space-y-4">
              {loading ? (
                <p className="text-center text-white/40 text-sm">Loading…</p>
              ) : null}
              {echoesLoading ? <p className="text-white/30 text-sm text-center py-4">Loading…</p> : null}
              {echoes.map((lyricBack) => (
                <div
                  key={lyricBack.id}
                  className="bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/15 rounded-2xl p-5"
                >
                  <div className="flex items-start gap-4 mb-5">
                    <Avatar className="w-10 h-10 border border-amber-500/30">
                      <AvatarImage src={lyricBack.avatar} alt={lyricBack.username} />
                      <AvatarFallback className="bg-amber-500/20 text-amber-400 text-xs">
                        {(lyricBack.username || "??").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/60 mb-2">{lyricBack.username}</p>
                      <p className="text-lg font-serif italic text-amber-400 mb-2">&ldquo;{lyricBack.lyric}&rdquo;</p>
                      <p className="text-white/40 text-xs">— {lyricBack.artist}, {lyricBack.song}</p>
                    </div>
                  </div>
                  
                  {/* Actions Row */}
                  <div className="flex items-end justify-between pt-3 border-t border-amber-500/10">
                    {/* Resonate - Left */}
                    <button className="flex flex-col items-center gap-1 text-white/40 hover:text-amber-400 transition-colors group">
                      <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] uppercase tracking-wide">Resonate · {lyricBack.resonates || 0}</span>
                    </button>
                    
                    {/* Lyric Back - Center */}
                    <button className="flex flex-col items-center gap-1 text-white/40 hover:text-amber-400 transition-colors group">
                      <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] uppercase tracking-wide">Lyric Back</span>
                    </button>
                    
                    {/* Card - Right (with vibe tag) */}
                    <div className="flex items-end gap-3">
                      <button className="flex flex-col items-center gap-1 text-white/40 hover:text-amber-400 transition-colors group">
                        <CreditCard className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] uppercase tracking-wide">Card</span>
                      </button>
                      <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/20 rounded-full text-amber-400/70 text-[10px] font-normal">
                        {lyricBack.emotion}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function LyricBackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#08070C] flex items-center justify-center"><p className="text-amber-400 font-serif italic">Loading…</p></div>}>
      <LyricBackContent />
    </Suspense>
  )
}
