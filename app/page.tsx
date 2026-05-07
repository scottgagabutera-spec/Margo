'use client';
import { usePosts } from '@/hooks/usePosts';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

import { useEffect, useState } from 'react';



// lyricCards replaced with real Firebase data

// stats replaced with live Firebase counts

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [totalSongs, setTotalSongs] = useState(0);
  const [allPostCount, setAllPostCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!db) return;
    const unsubSongs = onValue(ref(db, 'songs'), (snap) => {
      let count = 0;
      snap.forEach((child) => {
        if (child.val().status === 'active') count++;
      });
      setTotalSongs(count);
    });
    const unsubPosts = onValue(ref(db, 'posts'), (snap) => {
      let count = 0;
      snap.forEach((child) => {
        const s = child.val().status;
        if (s !== 'hidden' && s !== 'private') count++;
      });
      setAllPostCount(count);
    });
    return () => { unsubSongs(); unsubPosts(); };
  }, []);

  if (!mounted) return null;

  const liveCards = allPosts.slice(0, 4);
  const { totalPosts, uniqueArtists, uniqueSongs, topArtist, topSong, topEmotion } = calcStats();
  const stats = [
    { number: String(totalPosts || '…'), label: 'Lyrics', context: 'shared so far' },
    { number: String(uniqueArtists || '…'), label: 'Artists Featured', context: 'from top charts' },
    { number: String(uniqueSongs || '…'), label: 'Songs Featured', context: 'across genres' },
    { value: topArtist || '—', label: 'Top Artist', context: 'most quoted' },
    { value: topSong || '—', label: 'Top Song', context: 'most used' },
    { value: topEmotion || '—', label: 'Trending Feeling', context: 'this season' },
  ];

  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-br from-[#08070C] via-[#0a0909] to-[#0f0e14]">
      {/* Animated ambient background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Top-left glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" />
        {/* Bottom-right glow */}
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl animate-pulse animation-delay-2000" />
        {/* Center subtle glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-amber-500/5 to-transparent rounded-full blur-3xl animate-pulse animation-delay-1000" />
      </div>

      {/* Film grain texture */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 border-b border-amber-500/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 80 80" fill="none">
              <path d="M17 57 L17 27 L29 45 L40 26 L51 45 L63 27 L63 57" stroke="#08070C" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <rect x="35" y="60" width="10" height="4" rx="2" fill="#08070C" opacity=".5"/>
            </svg>
          </div>
          <span className="text-amber-400 text-sm font-medium tracking-widest uppercase">Margo</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/music" className="px-4 py-2 text-xs text-amber-200/70 border border-amber-500/30 rounded-full hover:border-amber-500/60 hover:bg-amber-500/5 transition-all duration-300 tracking-wide uppercase">
            Music
          </a>
          <a href="/compose" className="px-5 py-2 text-xs bg-amber-400 text-[#08070C] rounded-full font-medium hover:bg-amber-300 transition-all duration-300 tracking-wide uppercase">
            + Share a Lyric
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-5 flex flex-col items-center px-6 md:px-8 py-16 md:py-32 text-center max-w-4xl mx-auto">
        {/* Eyebrow with pulse */}
        <div className="inline-flex items-center gap-2 mb-8 md:mb-12 px-4 py-2 bg-amber-500/8 border border-amber-500/25 rounded-full">
          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
          <span className="text-xs text-amber-300/80 font-medium tracking-widest uppercase">{totalPosts || '…'} lyrics live right now</span>
        </div>

        {/* Headline - More dramatic and cinematic */}
        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-light leading-tight tracking-tight mb-6 md:mb-8 text-transparent bg-clip-text bg-gradient-to-b from-amber-50 to-amber-100">
          The place where a<br className="hidden md:block" />
          <span className="relative inline-block">
            <span className="relative z-10">song line</span>
            <span className="absolute inset-x-0 bottom-2 h-1 bg-gradient-to-r from-amber-400/30 to-transparent rounded-full blur-md" />
          </span>
          <em className="not-italic"> says it.</em>
        </h1>

        {/* Subheading */}
        <p className="text-base md:text-lg text-amber-50/50 leading-relaxed max-w-lg mb-6 md:mb-8 font-light">
          Post the lyric that says what you couldn&apos;t. Someone sends one back. That&apos;s a Lyric Back.
        </p>

        {/* Loop descriptor */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-10 md:mb-14 text-xs text-amber-300/60 uppercase tracking-wider font-medium">
          <span>Listen</span>
          <div className="hidden md:block w-4 h-px bg-gradient-to-r from-amber-500/0 to-amber-500/0" />
          <span className="md:hidden">→</span>
          <span>Feel a line</span>
          <div className="hidden md:block w-4 h-px bg-gradient-to-r from-amber-500/0 to-amber-500/0" />
          <span className="md:hidden">→</span>
          <span>Share it</span>
          <div className="hidden md:block w-4 h-px bg-gradient-to-r from-amber-500/0 to-amber-500/0" />
          <span className="md:hidden">→</span>
          <span>Get a Lyric Back</span>
        </div>

        {/* Featured Lyric Box - Enhanced */}
        <div className="w-full max-w-2xl mx-auto mb-10 md:mb-16 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-amber-500/0 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-gradient-to-b from-amber-500/8 to-amber-500/3 border border-amber-500/20 rounded-2xl px-6 md:px-10 py-8 md:py-12 backdrop-blur-sm">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent rounded-full" />
            
            <div className="text-xs text-amber-400/60 font-medium tracking-widest uppercase mb-4">Nostalgia · Featured</div>
            <p className="font-serif italic text-lg md:text-2xl leading-relaxed text-amber-50/90 mb-6">
              &quot;Keep me in your mirror but don&apos;t take your eyes off the road, holding on won&apos;t get us any nearer cause we got a long way to go...&quot;
            </p>
            <div className="text-xs text-amber-100/30 font-medium tracking-wide">Mirror · Madison</div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-12 md:mb-20">
          <a href="/feed" className="px-8 py-3 bg-gradient-to-r from-amber-400 to-amber-300 text-[#08070C] rounded-full font-medium text-sm uppercase tracking-wide hover:from-amber-300 hover:to-amber-200 transition-all duration-300 shadow-lg hover:shadow-amber-500/20 w-full sm:w-auto">
            See What&apos;s Live
          </a>
          <a href="/compose" className="px-6 py-3 border border-amber-500/30 text-amber-100/70 rounded-full font-medium text-sm uppercase tracking-wide hover:border-amber-500/60 hover:bg-amber-500/5 transition-all duration-300 w-full sm:w-auto">
            ↓ Share a Lyric
          </a>
        </div>
      </section>

      {/* Live Strip Section */}
      <section className="relative z-5 px-6 md:px-8 max-w-7xl mx-auto mb-6">
        <div className="text-xs text-amber-100/25 text-center font-medium tracking-widest uppercase mb-6 md:mb-8">↓ What people are saying right now</div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {liveCards.map((post) => (
            <div
              key={post.id}
              className="group relative bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/15 rounded-xl p-5 hover:border-amber-500/40 transition-all duration-300 hover:bg-amber-500/8 backdrop-blur-sm"
            >
              {/* Card header with avatar and timestamp */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-amber-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-[#08070C] tracking-tight">{(post.username || "AN").slice(0,2).toUpperCase()}</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-xs font-medium text-amber-100">{post.username || "Anonymous"}</div>
                    <div className="text-xs text-amber-100/40 font-light">{post.timestamp ? (() => { const diff = Date.now() - post.timestamp; const m = Math.floor(diff/60000); if (m < 60) return m+'m ago'; const h = Math.floor(m/60); if (h < 24) return h+'h ago'; return Math.floor(h/24)+'d ago'; })() : ''}</div>
                  </div>
                </div>
              </div>

              {/* Emotion tag */}
              <div className="inline-block text-xs text-amber-400/70 font-medium tracking-widest uppercase mb-3">
                {post.emotion || "Feeling"}
              </div>

              {/* Lyric text */}
              <p className="font-serif italic text-sm leading-relaxed text-amber-50/85 line-clamp-3">
                {post.text}
              </p>

              {/* Hover indicator */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="text-amber-400/60 text-xs">→</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="relative z-5 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent my-16 md:my-24" />

      {/* Stats Section - Enhanced with context */}
      <section className="relative z-5 max-w-7xl mx-auto px-6 md:px-8 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 md:gap-0">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center text-center py-6 md:py-8 border-r border-amber-500/10 last:border-r-0"
            >
              {stat.number ? (
                <div className="font-serif text-3xl md:text-4xl font-semibold text-amber-400 mb-2 leading-none">
                  {stat.number}
                </div>
              ) : (
                <div className="font-serif text-2xl md:text-3xl font-medium text-amber-400 mb-2">
                  {stat.value}
                </div>
              )}
              
              <div className="text-xs text-amber-100/50 font-medium tracking-widest uppercase mb-3">
                {stat.label}
              </div>

              {/* Context line - NEW */}
              <div className="text-xs text-amber-100/30 font-light tracking-wide">
                {stat.context}
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* Footer */}
      <footer className="relative z-10 border-t border-amber-500/10 px-6 md:px-10 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
            <svg width="11" height="11" viewBox="0 0 80 80" fill="none">
              <path d="M17 57 L17 27 L29 45 L40 26 L51 45 L63 27 L63 57" stroke="#08070C" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <span className="text-amber-400/60 text-xs tracking-widest uppercase">Margo</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="/about" className="text-xs text-white/20 hover:text-white/50 transition-colors tracking-wide">About</a>
          <a href="/privacy" className="text-xs text-white/20 hover:text-white/50 transition-colors tracking-wide">Privacy</a>
          <a href="/terms" className="text-xs text-white/20 hover:text-white/50 transition-colors tracking-wide">Terms</a>
          <a href="/contact" className="text-xs text-white/20 hover:text-white/50 transition-colors tracking-wide">Contact</a>
          <a href="https://linkedin.com/company/trymargo" target="_blank" rel="noopener" className="text-xs text-white/20 hover:text-amber-400/60 transition-colors tracking-wide">LinkedIn</a>
        </div>
        <div className="text-xs text-white/10 tracking-wide">© {new Date().getFullYear()} Margo</div>
      </footer>
    </div>
  );
}
