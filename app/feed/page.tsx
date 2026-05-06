'use client';
import { CardExportModal } from '@/components/card-export-modal';
import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Download } from 'lucide-react';
import { usePosts, Post } from '@/hooks/usePosts';
import { db } from '@/lib/firebase'
import { ref, set, remove, onValue } from 'firebase/database'
import { useUsername } from '@/hooks/useUsername';

export default function FeedPage() {
  const username = useUsername();
  const [hoveredPostId, setHoveredPostId] = useState<number | null>(null);
  const [selectedVibe, setSelectedVibe] = useState<string>('ALL');
  const [feedLimit, setFeedLimit] = useState(50)
  const { posts, loading } = usePosts(feedLimit)
  const [selectedSort, setSelectedSort] = useState<string>('NEW');
  const [showCard, setShowCard] = useState<boolean>(false);

  const vibes = ['ALL', 'LOVE', 'HEARTBREAK', 'HOPE', 'NOSTALGIA', 'HEALING', 'JOY', 'RAGE', 'LONELINESS', 'SEND IT', 'LET OUT'];
  const sorts = ['NEW', 'TRENDING', 'TOP'];

  const [resonated, setResonated] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const saved = localStorage.getItem('margoResonated')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  const [resonateCounts, setResonateCounts] = useState<Record<string, number>>({})

  // Load analytics (resonates map) from Firebase
  useEffect(() => {
    if (!db) return
    const analyticsRef = ref(db, 'analytics')
    const unsub = onValue(analyticsRef, (snap) => {
      const data = snap.val() || {}
      const counts: Record<string, number> = {}
      Object.keys(data).forEach(postId => {
        counts[postId] = Object.keys(data[postId]?.resonates || {}).length
      })
      setResonateCounts(counts)
    })
    return () => unsub()
  }, [])

  const toggleResonate = async (postId: string) => {
    const myId = typeof window !== 'undefined'
      ? (localStorage.getItem('margoAnonName') || 'anon')
      : 'anon'
    const alreadyResonated = resonated.has(postId)

    // Optimistic UI
    setResonated(prev => {
      const next = new Set(prev)
      alreadyResonated ? next.delete(postId) : next.add(postId)
      try { localStorage.setItem('margoResonated', JSON.stringify([...next])) } catch {}
      return next
    })
    setResonateCounts(prev => ({
      ...prev,
      [postId]: Math.max(0, (prev[postId] || 0) + (alreadyResonated ? -1 : 1))
    }))

    if (!db) return
    const resonateRef = ref(db, `analytics/${postId}/resonates/${myId}`)
    try {
      if (alreadyResonated) {
        await remove(resonateRef)
      } else {
        await set(resonateRef, true)
      }
    } catch (e) {
      // Rollback
      setResonated(prev => {
        const next = new Set(prev)
        alreadyResonated ? next.add(postId) : next.delete(postId)
        return next
      })
      setResonateCounts(prev => ({
        ...prev,
        [postId]: Math.max(0, (prev[postId] || 0) + (alreadyResonated ? 1 : -1))
      }))
    }
  };

  const getVibeColor = (vibe: string) => {
    const vibes: { [key: string]: string } = {
      'Nostalgia': 'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-300',
      'Empowerment': 'from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-300',
      'Triumph': 'from-green-500/20 to-green-500/5 border-green-500/30 text-green-300',
      'Love': 'from-red-500/20 to-red-500/5 border-red-500/30 text-red-300',
      'Confidence': 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 text-yellow-300',
      'Resilience': 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-300',
    };
    return vibes[vibe] || vibes['Nostalgia'];
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-gradient-to-br from-[#08070C] via-[#0a0909] to-[#0f0e14]">
      {/* Animated ambient background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl animate-pulse animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-amber-500/5 to-transparent rounded-full blur-3xl animate-pulse animation-delay-1000" />
      </div>

      {/* Film grain texture */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Navigation */}
      <nav className="relative z-10 sticky top-0 flex items-center justify-between px-6 md:px-10 py-5 border-b border-amber-500/10 backdrop-blur-md bg-gradient-to-b from-[#08070C]/80 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 80 80" fill="none">
              <path d="M17 57 L17 27 L29 45 L40 26 L51 45 L63 27 L63 57" stroke="#08070C" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <rect x="35" y="60" width="10" height="4" rx="2" fill="#08070C" opacity=".5" />
            </svg>
          </div>
          <span className="text-amber-400 text-sm font-medium tracking-widest uppercase">Margo</span>
        </div>
        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-2 text-xs text-amber-200/70 border border-amber-500/30 rounded-full hover:border-amber-500/60 hover:bg-amber-500/5 transition-all duration-300 tracking-wide uppercase">
            Home
          </a>
          <a href="/compose" className="px-5 py-2 text-xs bg-amber-400 text-[#08070C] rounded-full font-medium hover:bg-amber-300 transition-all duration-300 tracking-wide uppercase">
            + Share a Lyric
          </a>
        </div>
      </nav>

      {/* Feed Header */}
      <section className="relative z-5 border-b border-amber-500/10 py-10 md:py-14 px-6 md:px-10">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-amber-500/8 border border-amber-500/25 rounded-full">
            <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
            <span className="text-xs text-amber-300/80 font-medium tracking-widest uppercase">Live feed from the community</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-light leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-amber-50 to-amber-100 mb-4">
            What people are saying right now
          </h1>
          <p className="text-sm md:text-base text-amber-50/50 leading-relaxed font-light">
            Every lyric is a message, a conversation, a reply to the world. Resonate, reply, or save for later.
          </p>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="relative z-5 sticky top-20 border-b border-amber-500/10 bg-gradient-to-b from-[#08070C]/95 to-[#08070C]/80 backdrop-blur-md px-6 md:px-10 py-6">
        <div className="max-w-5xl mx-auto">
          {/* Vibe Filters - Scrollable on mobile */}
          <div className="mb-6 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            <div className="flex gap-2 md:flex-wrap md:gap-2 whitespace-nowrap md:whitespace-normal">
              {vibes.map((vibe) => (
                <button
                  key={vibe}
                  onClick={() => setSelectedVibe(vibe)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium tracking-wide uppercase transition-all duration-300 ${
                    selectedVibe === vibe
                      ? 'bg-amber-400 text-[#08070C] border border-amber-400'
                      : 'bg-amber-500/10 text-amber-200/70 border border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/20'
                  }`}
                >
                  {vibe}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Tabs */}
          <div className="flex items-center gap-1 border-t border-amber-500/10 pt-6">
            {sorts.map((sort) => (
              <button
                key={sort}
                onClick={() => setSelectedSort(sort)}
                className={`px-4 py-2 text-xs font-medium tracking-widest uppercase transition-all duration-300 relative ${
                  selectedSort === sort
                    ? 'text-amber-300'
                    : 'text-amber-100/40 hover:text-amber-100/70'
                }`}
              >
                {sort}
                {selectedSort === sort && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Feed Grid */}
      <div className="relative z-5 max-w-5xl mx-auto px-6 md:px-10 py-12 md:py-16">
        <div className="space-y-6 md:space-y-8">
          {posts.map((post) => (
            <div
              key={post.id}
              onMouseEnter={() => setHoveredPostId(post.id)}
              onMouseLeave={() => setHoveredPostId(null)}
              className="group relative"
            >
              {/* Post container */}
              <div className="relative bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/15 rounded-2xl p-8 md:p-10 transition-all duration-300 hover:border-amber-500/40 hover:bg-amber-500/8 backdrop-blur-sm">
                {/* Top accent line */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent rounded-full" />

                {/* Post Header */}
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-4">
                    {/* User Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-[#08070C] tracking-tight">
                        {(post.username || "??").slice(0, 2).toUpperCase()}
                      </span>
                    </div>

                    {/* User Info */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-medium text-amber-100">
                          {post.username}
                        </div>
                        <div className="text-[10px] text-amber-100/40 font-light">
                          {post.timestamp ? new Date(post.timestamp).toLocaleDateString() : ""}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Lyric - The Hero */}
                <div className="mb-8 md:mb-10">
                  <p className="font-serif italic text-3xl md:text-4xl lg:text-5xl leading-relaxed text-transparent bg-clip-text bg-gradient-to-b from-amber-50 to-amber-100 mb-6">
                    {post.text}
                  </p>

                  {/* Song Credit */}
                  <div className="text-[10px] text-amber-100/50 font-medium tracking-widest uppercase">
                    From {post.knowledge?.song || 'Unknown Song'} · {post.knowledge?.artist || 'Unknown Artist'}
                  </div>
                </div>

                {/* YouTube thumbnail */}
                {post.youtubeMeta?.thumbnail && (
                  <a
                    href={post.youtubeMeta.youtubeUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mb-6 rounded-xl overflow-hidden border border-amber-500/20 hover:border-amber-500/50 transition-all duration-300 group/yt"
                  >
                    <div className="relative">
                      <img
                        src={post.youtubeMeta.thumbnail}
                        alt={post.youtubeMeta.title || ''}
                        className="w-full object-cover max-h-48"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/yt:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center">
                          <svg className="w-5 h-5 text-black ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-3 text-xs text-white/70 font-medium">{post.youtubeMeta.channel}</div>
                    </div>
                  </a>
                )}

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-amber-500/20 to-transparent mb-6 md:mb-8" />

                {/* Interaction Stats */}
                <div className="flex items-center gap-6 md:gap-10 text-sm mb-6 md:mb-8">
                  <div className="flex flex-col gap-1">
                    <div className="text-lg font-semibold text-amber-400">
                      {resonateCounts[post.id] ?? post.resonates ?? 0}
                    </div>
                    <div className="text-[10px] text-amber-100/40 font-light tracking-wide uppercase">
                      Resonances
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-lg font-semibold text-amber-400">
                      {post.replies || 0}
                    </div>
                    <div className="text-[10px] text-amber-100/40 font-light tracking-wide uppercase">
                      Lyric Backs
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Full width spread */}
                <div className="flex items-center justify-between pt-4 md:pt-5 border-t border-amber-500/10">
                  <button
                    onClick={() => toggleResonate(post.id)}
                    className={`flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                      resonated.has(post.id)
                        ? 'text-amber-400'
                        : 'text-amber-100/50 hover:text-amber-400'
                    }`}
                  >
                    <Heart
                      size={18}
                      className={resonated.has(post.id) ? 'fill-current' : ''}
                    />
                    <span className="text-[9px] font-medium tracking-widest uppercase">Resonate</span>
                  </button>

                  <a href={`/lyric-back?postId=${post.id}`} className="flex flex-col items-center justify-center gap-2 text-amber-100/50 hover:text-amber-400 transition-all duration-300">
                    <MessageCircle size={18} />
                    <span className="text-[9px] font-medium tracking-widest uppercase">Lyric Back</span>
                  </a>

                  <button onClick={() => setShowCard(true)} className="flex flex-col items-center justify-center gap-2 text-amber-100/50 hover:text-amber-400 transition-all duration-300">
                    <Download size={18} />
                    <span className="text-[9px] font-medium tracking-widest uppercase">Card</span>
                  </button>

                  {/* Vibe Badge - Bottom right corner */}
                  <div className={`px-2 py-1 rounded text-[9px] font-medium tracking-widest uppercase text-amber-100/50 ${getVibeColor(post.emotion || "")}`}>
                    {post.emotion || ""}
                  </div>
                </div>

                {/* Hover indicator */}
                <div className={`absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${hoveredPostId === post.id ? 'opacity-100' : ''}`}>
                  <div className="text-amber-400/60 text-sm">✧</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="flex justify-center mt-12 md:mt-16">
          <button onClick={() => setFeedLimit(prev => prev + 50)} className="px-8 py-4 border border-amber-500/30 text-amber-100/70 rounded-full font-medium text-sm uppercase tracking-wide hover:border-amber-500/60 hover:bg-amber-500/5 transition-all duration-300">
            {loading ? 'Loading…' : 'Load more lyrics'}
          </button>
        </div>
      </div>

      {/* Footer divider */}
      <div className="relative z-5 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent my-16" />

      {/* Footer CTA */}
      <section className="relative z-5 text-center py-12 md:py-16 px-6 md:px-10">
        <p className="text-sm text-amber-100/50 font-light mb-6">
          Have a lyric that says what you couldn&apos;t?
        </p>
        <button className="px-8 py-3 bg-gradient-to-r from-amber-400 to-amber-300 text-[#08070C] rounded-full font-medium text-sm uppercase tracking-wide hover:from-amber-300 hover:to-amber-200 transition-all duration-300 shadow-lg hover:shadow-amber-500/20">
          Share Your Lyric
        </button>
      </section>
      <CardExportModal open={showCard} onOpenChange={setShowCard} />
    </div>
  );
}
