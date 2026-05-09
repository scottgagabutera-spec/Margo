'use client'
import { useState, useEffect, useRef } from 'react'
import { usePosts } from '@/hooks/usePosts'
import type { Post } from '@/hooks/usePosts'
import { useUsername } from '@/hooks/useUsername'
import { MargoNav } from '@/components/margo-nav'
import { CardExportModal } from '@/components/card-export-modal'
import { db } from '@/lib/firebase'
import { ref, set, remove, onValue } from 'firebase/database'
import Link from 'next/link'

const EMOTION_COLORS: Record<string, string> = {
  love: '#FF6B9D', heartbreak: '#ff6060', hope: '#7B9FFF',
  nostalgia: '#E8C547', healing: '#4ade80', joy: '#ffc847',
  rage: '#FF6440', loneliness: '#a0a0ff', sendit: '#00e5c8', letout: '#c864ff',
}

const VIBE_LABELS: Record<string, string> = {
  love: 'Love', heartbreak: 'Heartbreak', hope: 'Hope', nostalgia: 'Nostalgia',
  healing: 'Healing', joy: 'Joy', rage: 'Rage', loneliness: 'Loneliness',
  sendit: 'Send It', letout: 'Let Out',
}

const VIBES = ['ALL', 'LOVE', 'HEARTBREAK', 'HOPE', 'NOSTALGIA', 'HEALING', 'JOY', 'RAGE', 'LONELINESS', 'SENDIT', 'LETOUT']
const SORTS = ['NEW', 'TRENDING', 'TOP']

function normalizeEmotion(e: string) {
  if (!e) return ''
  return e.replace(/send.?it/i, 'SENDIT').replace(/let.?out/i, 'LETOUT')
    .replace('SendIt', 'SENDIT').replace('LetOut', 'LETOUT')
    .replace('SEND IT', 'SENDIT').replace('LET OUT', 'LETOUT')
    .toUpperCase()
}

function timeAgo(ts: number) {
  const diff = (Date.now() - ts) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'
  return Math.floor(diff / 86400) + 'd ago'
}

interface LyricLine { id: number; line: string; start: number; end: number }

function parseSRT(srt: string): LyricLine[] {
  const blocks = srt.trim().split(/\n\s*\n/)
  const lines: LyricLine[] = []
  blocks.forEach((block, i) => {
    const parts = block.trim().split('\n')
    if (parts.length < 3) return
    const match = parts[1].match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/)
    if (!match) return
    const toSec = (h: string, m: string, s: string, ms: string) =>
      parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000
    lines.push({ id: i, line: parts.slice(2).join(' ').trim(), start: toSec(match[1],match[2],match[3],match[4]), end: toSec(match[5],match[6],match[7],match[8]) })
  })
  return lines
}

function Tier1Player({ audioUrl, songId }: { audioUrl: string; songId: string | null }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [lyricsLoaded, setLyricsLoaded] = useState(false)

  useEffect(() => {
    const audio = new Audio(audioUrl)
    audio.preload = 'metadata'
    audioRef.current = audio
    const onTime = () => { setCurrentTime(audio.currentTime); setProgress((audio.currentTime / (audio.duration || 1)) * 100) }
    const onMeta = () => setDuration(audio.duration || 0)
    const onEnded = () => { setPlaying(false); setProgress(0); setCurrentTime(0) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnded)
    return () => { audio.pause(); audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('loadedmetadata', onMeta); audio.removeEventListener('ended', onEnded) }
  }, [audioUrl])

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (!lyricsLoaded && songId && db) {
      try {
        const { get, ref: dbRef } = await import('firebase/database')
        const snap = await get(dbRef(db, `songs/${songId}`))
        if (snap.exists()) {
          const s = snap.val()
          if (s.srt) setLyrics(parseSRT(s.srt))
        }
      } catch {}
      setLyricsLoaded(true)
    }
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play().catch(() => {}); setPlaying(true) }
  }

  const fmt = (s: number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`
  const currentLine = lyrics.find(l => currentTime >= l.start && currentTime < l.end)

  return (
    <div>
      {/* Player row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: currentLine ? '12px' : '0' }}>
        <button onClick={toggle} style={{
          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
          background: 'var(--gold)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          WebkitAppearance: 'none', outline: 'none',
          WebkitTapHighlightColor: 'transparent',
          MozAppearance: 'none', touchAction: 'manipulation',
        }}>
          <span style={{ color: 'var(--bg)', fontSize: '0.7rem', lineHeight: 1, userSelect: 'none' }}>{playing ? '⏸' : '▶'}</span>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginBottom: '4px' }}>
            <div style={{ height: '100%', width: progress + '%', background: 'var(--gold)', transition: 'width 200ms linear' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--text-3)' }}>{fmt(currentTime)}</span>
            <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--text-3)' }}>{duration > 0 ? fmt(duration) : '--:--'}</span>
          </div>
        </div>
      </div>
      {/* Inline karaoke line */}
      {playing && (
        <div style={{
          minHeight: '32px', padding: '8px 12px',
          background: 'rgba(232,197,71,0.06)', borderRadius: '8px',
          borderLeft: '2px solid var(--gold)',
          transition: 'all 200ms ease',
        }}>
          <p style={{
            fontFamily: 'var(--font-lora), serif', fontStyle: 'italic',
            fontSize: '0.82rem', color: currentLine ? 'var(--gold)' : 'var(--text-3)',
            lineHeight: 1.4, margin: 0,
            transition: 'color 200ms ease',
          }}>
            {currentLine ? currentLine.line : '♪'}
          </p>
        </div>
      )}
    </div>
  )
}

function PostCard({
  post, resonated, resonateCount, onResonate, onExport
}: {
  post: Post
  resonated: boolean
  resonateCount: number
  onResonate: (id: string) => void
  onExport: (post: Post) => void
}) {
  const emotion = normalizeEmotion(post.emotion || '').toLowerCase()
  const color = EMOTION_COLORS[emotion] || 'var(--text-3)'
  const label = VIBE_LABELS[emotion] || post.emotion || ''
  const isTier1 = post.tier === 1
  const audioUrl = (post as any).audioUrl || null

  return (
    <div style={{
      background: isTier1 ? 'rgba(232,197,71,0.04)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isTier1 ? 'rgba(232,197,71,0.25)' : 'var(--border)'}`,
      borderRadius: '20px', padding: '20px',
      position: 'relative', overflow: 'hidden',
      transition: 'border-color 200ms ease',
    }}>
      {/* Top accent */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '60%', height: '1px',
        background: isTier1
          ? 'linear-gradient(to right, transparent, rgba(232,197,71,0.5), transparent)'
          : 'linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--gold), var(--gold-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, color: 'var(--bg)' }}>
              {(post.username || '??').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>
              {post.username || 'Anonymous'}
            </p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'var(--text-3)' }}>
              {post.timestamp ? timeAgo(post.timestamp) : ''}
            </p>
          </div>
        </div>
        {isTier1 && (
          <span style={{
            fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', fontWeight: 700,
            letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 10px',
            borderRadius: '50px', background: 'rgba(232,197,71,0.12)',
            border: '1px solid var(--gold-border)', color: 'var(--gold)',
          }}>Margo Original</span>
        )}
      </div>

      {/* Lyric */}
      <p style={{
        fontFamily: 'var(--font-lora), serif', fontStyle: 'italic',
        fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', color: 'var(--text)',
        lineHeight: 1.5, marginBottom: '16px',
      }}>
        &ldquo;{post.text}&rdquo;
      </p>

      {/* Song credit */}
      {(post.knowledge?.song || post.knowledge?.artist) && (
        <p style={{
          fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem',
          color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase',
          marginBottom: '20px',
        }}>
          {post.knowledge.song && post.knowledge.artist
            ? `${post.knowledge.song} · ${post.knowledge.artist}`
            : post.knowledge.song || post.knowledge.artist}
        </p>
      )}

      {/* YouTube thumbnail — hidden for Tier 1, they have the real player */}
      {!isTier1 && post.youtubeMeta?.thumbnail && (
        <a href={post.youtubeMeta.youtubeUrl || '#'} target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', marginBottom: '20px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', textDecoration: 'none' }}>
          <div style={{ position: 'relative' }}>
            <img src={post.youtubeMeta.thumbnail} alt="" style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'var(--bg)', fontSize: '0.7rem' }}>▶</span>
              </div>
            </div>
          </div>
        </a>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Resonate */}
        <button onClick={() => onResonate(post.id)} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
          color: resonated ? 'var(--gold)' : 'var(--text-2)',
          transition: 'color 150ms ease',
        }}>
          <span style={{ fontSize: '1rem' }}>{resonated ? '♥' : '♡'}</span>
          <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
            {resonateCount > 0 ? resonateCount : 'Resonate'}
          </span>
        </button>

        {/* Lyric Back */}
        <Link href={`/lyric-back?postId=${post.id}`} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          color: 'var(--text-2)', textDecoration: 'none', padding: '4px 8px',
          transition: 'color 150ms ease',
        }}>
          <span style={{ fontSize: '1rem' }}>↩</span>
          <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Lyric Back</span>
        </Link>

        {/* Export */}
        <button onClick={() => onExport(post)} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
          color: 'var(--text-2)', transition: 'color 150ms ease',
        }}>
          <span style={{ fontSize: '1rem' }}>↗</span>
          <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Share</span>
        </button>

        {/* Emotion tag */}
        {label && (
          <span style={{
            fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', fontWeight: 700,
            letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 10px',
            borderRadius: '50px', background: 'rgba(255,255,255,0.04)',
            color,
          }}>{label}</span>
        )}
      </div>

      {/* Tier 1 footer — player left, Full Karaoke right */}
      {isTier1 && (
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(232,197,71,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              {audioUrl && <Tier1Player audioUrl={audioUrl} songId={post.songId || null} />}
            </div>
            {post.songId && (
              <Link href={`/music/player?id=${post.songId}`} style={{
                fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', fontWeight: 700,
                color: 'var(--gold)', letterSpacing: '1px', textTransform: 'uppercase',
                textDecoration: 'none', padding: '4px 10px', border: '1px solid var(--gold-border)',
                borderRadius: '50px', flexShrink: 0, alignSelf: 'flex-start',
              }}>Full Karaoke →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function FeedPage() {
  const { username } = useUsername()
  const { posts, loading } = usePosts()
  const [selectedVibe, setSelectedVibe] = useState('ALL')
  const [selectedSort, setSelectedSort] = useState('NEW')
  const [searchQuery, setSearchQuery] = useState('')
  const [resonated, setResonated] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const saved = localStorage.getItem('margoResonated')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  const [resonateCounts, setResonateCounts] = useState<Record<string, number>>({})
  const [analytics, setAnalytics] = useState<Record<string, any>>({})
  const [exportPost, setExportPost] = useState<Post | null>(null)

  useEffect(() => {
    if (!db) return
    const unsub = onValue(ref(db, 'analytics'), (snap) => {
      const data = snap.val() || {}
      const counts: Record<string, number> = {}
      Object.keys(data).forEach(id => {
        counts[id] = Object.keys(data[id]?.resonates || {}).length
      })
      setResonateCounts(counts)
      setAnalytics(data)
    })
    return () => unsub()
  }, [])

  const getEngagement = (post: Post) => {
    const a = analytics[post.id] || {}
    return (a.views || 0) + (Object.keys(a.resonates || {}).length * 4) + (Object.keys(a.echoes || {}).length * 5)
  }

  const getAge = (post: Post) => {
    if (!post.timestamp) return 999
    return (Date.now() - post.timestamp) / 3600000
  }

  const getScore = (post: Post) => {
    const age = getAge(post)
    const engage = getEngagement(post)
    if (selectedSort === 'NEW') return Math.exp(-age / 18) * 1000 + engage * 0.05
    if (selectedSort === 'TRENDING') return engage / Math.pow(age + 2, 1.4)
    if (selectedSort === 'TOP') return engage
    return 0
  }

  const filteredPosts = posts
    .filter(p => {
      const norm = normalizeEmotion(p.emotion || '')
      const matchesVibe = selectedVibe === 'ALL' || norm === selectedVibe
      if (!searchQuery.trim()) return matchesVibe
      const q = searchQuery.toLowerCase()
      return matchesVibe && (
        (p.text || '').toLowerCase().includes(q) ||
        (p.knowledge?.song || '').toLowerCase().includes(q) ||
        (p.knowledge?.artist || '').toLowerCase().includes(q) ||
        (p.emotion || '').toLowerCase().includes(q) ||
        (p.username || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => getScore(b) - getScore(a))

  const toggleResonate = async (postId: string) => {
    const rawId = typeof window !== 'undefined'
      ? (localStorage.getItem('margoAnonName') || 'anon') : 'anon'
    const myId = rawId.replace(/[.#$[]]/g, '_')
    const already = resonated.has(postId)
    setResonated(prev => {
      const next = new Set(prev)
      already ? next.delete(postId) : next.add(postId)
      try { localStorage.setItem('margoResonated', JSON.stringify([...next])) } catch {}
      return next
    })
    setResonateCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + (already ? -1 : 1)) }))
    if (!db) return
    const rRef = ref(db, `analytics/${postId}/resonates/${myId}`)
    try {
      already ? await remove(rRef) : await set(rRef, true)
    } catch {
      setResonated(prev => {
        const next = new Set(prev)
        already ? next.add(postId) : next.delete(postId)
        return next
      })
      setResonateCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + (already ? 1 : -1)) }))
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <MargoNav />

      {/* Ambient glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-128px', left: '-128px', width: '384px', height: '384px', background: 'rgba(232,197,71,0.04)', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-160px', right: '-160px', width: '384px', height: '384px', background: 'rgba(232,197,71,0.03)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>

      {/* Feed header */}
      <section style={{ position: 'relative', zIndex: 5, borderBottom: '1px solid var(--border)', padding: '56px 24px 16px', textAlign: 'center' }}>

        <h1 style={{ fontFamily: 'var(--font-lora), serif', fontSize: 'clamp(1.1rem, 2.5vw, 1.6rem)', color: 'var(--text)', fontWeight: 400, marginBottom: '8px', lineHeight: 1.3 }}>
          What people are saying right now
        </h1>
        <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.82rem', color: 'var(--text-2)', maxWidth: '480px', margin: '0 auto' }}>
          Every lyric is a message.
        </p>
      </section>

      {/* Filters */}
      <div style={{ position: 'sticky', top: '64px', zIndex: 30, background: 'rgba(7,6,10,0.92)', backdropFilter: 'blur(12px)', padding: '12px 24px 0' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          {/* Vibe pills */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {VIBES.map(vibe => (
              <button key={vibe} onClick={() => setSelectedVibe(vibe)} style={{
                flexShrink: 0, padding: '4px 10px', borderRadius: '50px',
                fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', fontWeight: 700,
                letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer',
                border: '1px solid',
                background: selectedVibe === vibe ? 'var(--gold)' : 'transparent',
                color: selectedVibe === vibe ? 'var(--bg)' : 'var(--text-3)',
                borderColor: selectedVibe === vibe ? 'var(--gold)' : 'var(--border)',
                transition: 'all 150ms ease',
              }}>{vibe === 'SENDIT' ? 'SEND IT' : vibe === 'LETOUT' ? 'LET OUT' : vibe}</button>
            ))}
          </div>

          {/* Sort tabs */}
          <div style={{ display: 'flex', gap: '4px', paddingTop: '8px', paddingBottom: '4px' }}>
            {SORTS.map(sort => (
              <button key={sort} onClick={() => setSelectedSort(sort)} style={{
                padding: '6px 16px', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700,
                letterSpacing: '2px', textTransform: 'uppercase',
                color: selectedSort === sort ? 'var(--gold)' : 'var(--text-3)',
                borderBottom: selectedSort === sort ? '2px solid var(--gold)' : '2px solid transparent',
                transition: 'all 150ms ease',
              }}>{sort}</button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', paddingBottom: '10px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search lyrics, songs, artists, feelings..."
              style={{
                width: '100%', height: '40px', padding: '0 40px 0 16px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                borderRadius: '10px', color: 'var(--text)', fontFamily: 'var(--font-lora), serif',
                fontSize: '0.75rem', outline: 'none', boxSizing: 'border-box',
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '1rem',
              }}>×</button>
            )}
          </div>
        </div>
      </div>

      {/* Posts */}
      <main style={{ position: 'relative', zIndex: 5, maxWidth: '720px', margin: '0 auto', padding: '32px 24px 80px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '64px 0' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)', opacity: 0.5 }} />
            ))}
          </div>
        )}

        {!loading && filteredPosts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-3)', fontSize: '1rem', marginBottom: '16px' }}>
              {searchQuery ? `No lyrics found for "${searchQuery}"` : `No ${selectedVibe === 'ALL' ? '' : selectedVibe.toLowerCase()} lyrics yet`}
            </p>
            <Link href="/compose" style={{
              padding: '10px 24px', border: '1px solid var(--border)',
              borderRadius: '50px', color: 'var(--text-3)',
              fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem',
              letterSpacing: '1px', textTransform: 'uppercase', textDecoration: 'none',
            }}>Be the first</Link>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              resonated={resonated.has(post.id)}
              resonateCount={resonateCounts[post.id] ?? post.resonates ?? 0}
              onResonate={toggleResonate}
              onExport={setExportPost}
            />
          ))}
        </div>

        {!loading && filteredPosts.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <div style={{ height: '1px', width: '96px', background: 'linear-gradient(to right, transparent, var(--border), transparent)', margin: '0 auto 16px' }} />
            <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.82rem', color: 'var(--text-3)' }}>you&apos;ve felt them all</p>
          </div>
        )}
      </main>

      {/* Export modal */}
      <CardExportModal
        open={!!exportPost}
        onOpenChange={(o) => { if (!o) setExportPost(null) }}
        lyric={exportPost?.text || ''}
        song={exportPost?.knowledge?.song || ''}
        artist={exportPost?.knowledge?.artist || ''}
        postId={exportPost?.id}
      />
    </div>
  )
}
