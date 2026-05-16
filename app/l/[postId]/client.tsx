'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MargoNav } from '@/components/margo-nav'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { usePost } from '@/hooks/usePost'
import { useSongs } from '@/hooks/useSongs'

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
    lines.push({
      id: i,
      line: parts.slice(2).join(' ').trim(),
      start: toSec(match[1], match[2], match[3], match[4]),
      end: toSec(match[5], match[6], match[7], match[8]),
    })
  })
  return lines
}

export function LyricShareClient({ postId }: { postId: string }) {
  const { post, loading } = usePost(postId)
  const { songs } = useSongs()
  const [playing, setPlaying] = useState(false)
  const [copied, setCopied] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Find the matching song for audio + SRT
  const song = songs.find(s => s.id === post?.songId) || null
  const isTier1 = post?.tier === 1

  // Snippet playback — finds the lyric line in SRT and plays that moment
  const playSnippet = () => {
    if (!song?.audioUrl || !song?.srt || !post?.text) return

    const lines = parseSRT(song.srt)
    const postText = (post.text || '').toLowerCase().trim()
    const match = lines.find(l =>
      l.line.toLowerCase().includes(postText.slice(0, 30)) ||
      postText.includes(l.line.toLowerCase().slice(0, 20))
    ) || lines[0]

    if (!match) return

    if (playing) {
      audioRef.current?.pause()
      if (timerRef.current) clearTimeout(timerRef.current)
      setPlaying(false)
      return
    }

    const audio = audioRef.current || new Audio(song.audioUrl)
    audioRef.current = audio
    audio.currentTime = match.start
    audio.play().catch(() => {})
    setPlaying(true)

    const duration = Math.min((match.end - match.start) * 1000 + 300, 8000)
    timerRef.current = setTimeout(() => {
      audio.pause()
      setPlaying(false)
    }, duration)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://trymargo.com/l/${postId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    const url = `https://trymargo.com/l/${postId}`
    const text = post?.text ? `"${post.text}"` : 'A lyric moment on Margo'
    if (navigator.share) {
      try { await navigator.share({ title: 'Margo', text, url }); return }
      catch (e: any) { if (e.name === 'AbortError') return }
    }
    handleCopyLink()
  }

  // ── Loading ──────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <MargoNav />
      <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--gold)', fontSize: '1rem' }}>Loading…</p>
    </div>
  )

  // ── Not found ────────────────────────────────────────────────────
  if (!post) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
      <MargoNav />
      <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'rgba(255,255,255,0.4)', fontSize: '1rem' }}>This lyric moment has gone quiet.</p>
      <Link href="/feed" style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)', textDecoration: 'none', padding: '10px 24px', border: '1px solid rgba(232,197,71,0.3)', borderRadius: '50px' }}>
        Back to Feed
      </Link>
    </div>
  )

  const lyric  = post.text || ''
  const songName  = post.knowledge?.song || song?.title || ''
  const artistName = post.knowledge?.artist || song?.artist || ''
  const artwork = post.knowledge?.artwork || song?.artwork || null
  const canPlay = isTier1 && !!song?.audioUrl && !!song?.srt

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .share-card { animation: fadeUp 500ms cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .action-btn:hover { border-color: rgba(232,197,71,0.5) !important; color: var(--text) !important; }
        .play-ring:hover { transform: scale(1.05); box-shadow: 0 8px 32px rgba(232,197,71,0.4) !important; }
      `}</style>

      <MargoNav />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 60px' }}>

        {/* Card */}
        <div
          className="share-card"
          style={{
            width: '100%', maxWidth: '480px',
            background: 'linear-gradient(160deg, rgba(28,24,36,0.98) 0%, rgba(14,12,18,0.99) 100%)',
            border: '1px solid rgba(232,197,71,0.18)',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,197,71,0.06)',
          }}
        >
          {/* Artwork */}
          {artwork && (
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/7', overflow: 'hidden' }}>
              <Image src={artwork} alt={songName} fill style={{ objectFit: 'cover', objectPosition: 'center top' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(14,12,18,0.1) 0%, rgba(14,12,18,0.85) 100%)' }} />
              {/* Margo badge */}
              {isTier1 && (
                <div style={{ position: 'absolute', top: '16px', right: '16px', padding: '4px 10px', background: 'rgba(232,197,71,0.15)', border: '1px solid rgba(232,197,71,0.4)', borderRadius: '50px', fontFamily: 'var(--font-lora), serif', fontSize: '0.52rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--gold)' }}>
                  Margo Original
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div style={{ padding: artwork ? '28px 32px 32px' : '40px 32px 32px' }}>

            {/* Lyric */}
            <p style={{
              fontFamily: 'var(--font-lora), serif',
              fontStyle: 'italic',
              fontSize: 'clamp(1.3rem, 4vw, 1.8rem)',
              color: 'var(--text)',
              lineHeight: 1.5,
              marginBottom: '20px',
            }}>
              &ldquo;{lyric}&rdquo;
            </p>

            {/* Song credit */}
            {(songName || artistName) && (
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '28px' }}>
                {songName && artistName ? `${songName} · ${artistName}` : songName || artistName}
              </p>
            )}

            {/* Play snippet — only for Tier 1 */}
            {canPlay && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px', padding: '16px 20px', background: 'rgba(232,197,71,0.04)', border: '1px solid rgba(232,197,71,0.12)', borderRadius: '14px' }}>
                <button
                  className="play-ring"
                  onClick={playSnippet}
                  style={{
                    width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                    background: 'var(--gold)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 200ms ease',
                    boxShadow: '0 4px 20px rgba(232,197,71,0.3)',
                  }}
                >
                  <PlayPauseIcon playing={playing} size={16} color="var(--bg)" />
                </button>
                <div>
                  <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', color: 'var(--text)', marginBottom: '2px' }}>
                    {playing ? 'Playing snippet…' : 'Play this moment'}
                  </p>
                  <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.5px' }}>
                    Hear the exact lyric in the song
                  </p>
                </div>
              </div>
            )}

            {/* CTAs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Full Karaoke — only for Tier 1 */}
              {isTier1 && post.songId && (
                <Link
                  href={`/music/player?id=${post.songId}${song?.audioUrl ? '&au=' + encodeURIComponent(song.audioUrl) : ''}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '15px 28px',
                    background: 'var(--gold)', color: 'var(--bg)',
                    borderRadius: '50px',
                    fontFamily: 'var(--font-lora), serif', fontWeight: 700,
                    fontSize: '0.6rem', letterSpacing: '1.5px', textTransform: 'uppercase',
                    textDecoration: 'none',
                    boxShadow: '0 6px 28px rgba(232,197,71,0.28)',
                    transition: 'all 200ms ease',
                  }}
                >
                  ▶ Full Karaoke
                </Link>
              )}

              {/* Open in Margo feed */}
              <Link
                href="/feed"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '15px 28px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '50px',
                  fontFamily: 'var(--font-lora), serif', fontWeight: 700,
                  fontSize: '0.6rem', letterSpacing: '1.5px', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
                  transition: 'all 200ms ease',
                }}
              >
                Open Margo Feed
              </Link>

              {/* Share row */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  className="action-btn"
                  onClick={handleCopyLink}
                  style={{
                    flex: 1, padding: '12px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '50px',
                    fontFamily: 'var(--font-lora), serif', fontWeight: 600,
                    fontSize: '0.58rem', letterSpacing: '1px', textTransform: 'uppercase',
                    color: copied ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer', transition: 'all 150ms ease',
                  }}
                >
                  {copied ? '✓ Copied' : '🔗 Copy Link'}
                </button>
                <button
                  className="action-btn"
                  onClick={handleShare}
                  style={{
                    flex: 1, padding: '12px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '50px',
                    fontFamily: 'var(--font-lora), serif', fontWeight: 600,
                    fontSize: '0.58rem', letterSpacing: '1px', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer', transition: 'all 150ms ease',
                  }}
                >
                  ↗ Share
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Margo branding below card */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>Shared on</p>
          <Link href="/" style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.9rem', fontWeight: 700, color: 'var(--gold)', textDecoration: 'none', letterSpacing: '3px', textTransform: 'uppercase' }}>
            Margo
          </Link>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>Every lyric is a message.</p>
        </div>

      </main>
    </div>
  )
}
