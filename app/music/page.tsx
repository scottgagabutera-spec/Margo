'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MargoNav } from '@/components/margo-nav'
import { useSongs, Song } from '@/hooks/useSongs'
import { useSharedLines } from '@/hooks/useSharedLines'

function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

function SongPreview({ song, onClose }: { song: Song; onClose: () => void }) {
  const { lines } = useSharedLines(song.title, song.artist)
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(7,6,10,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-hi)',
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '480px',
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)',
            color: 'var(--text-3)', fontSize: '1.1rem',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            transition: 'all 150ms ease',
            fontFamily: 'var(--font-lora), serif',
          }}
        >×</button>

        {/* Artwork */}
        {song.artwork && (
          <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
            <Image src={song.artwork} alt={song.title} fill style={{ objectFit: 'cover' }} />
          </div>
        )}

        {/* Title + Artist */}
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{song.title}</p>
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: '20px', letterSpacing: '0.5px' }}>{song.artist}</p>

        {/* Metrics */}
        <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>{formatNum(song.plays || 0)}</p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '2px', textTransform: 'uppercase' }}>Plays</p>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>{formatNum(song.resonates || 0)}</p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '2px', textTransform: 'uppercase' }}>Resonates</p>
          </div>
          <div style={{ paddingLeft: '24px', borderLeft: '1px solid var(--gold-border)' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)' }}>{formatNum(song.lyricUses || 0)}</p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, color: 'var(--gold)', opacity: 0.7, letterSpacing: '2px', textTransform: 'uppercase' }}>Lyric Uses</p>
          </div>
        </div>

        {/* Top shared line */}
        {lines[0] && (
          <div style={{ padding: '16px', background: 'var(--gold-faint)', border: '1px solid var(--gold-border)', borderRadius: '12px', marginBottom: '20px' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.6 }}>
              &ldquo;{lines[0].line}&rdquo;
            </p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '8px' }}>
              Most shared line · {lines[0].uses} {lines[0].uses === 1 ? 'use' : 'uses'}
            </p>
          </div>
        )}

        {/* CTA */}
        {song.status === 'live' || song.status === 'active' ? (
          <Link href={`/music/player?id=${song.id}`} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '15px 28px', background: 'var(--gold)', color: 'var(--bg)',
            borderRadius: '50px', fontFamily: 'var(--font-lora), serif',
            fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1px',
            textTransform: 'uppercase', textDecoration: 'none',
            minHeight: '52px', transition: 'all 150ms ease',
            boxShadow: '0 6px 28px rgba(232,197,71,0.28)',
          }}>Play Now</Link>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '15px 28px', background: 'var(--surface-2)',
            border: '1px solid var(--border)', borderRadius: '50px',
            fontFamily: 'var(--font-lora), serif', fontWeight: 700,
            fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase',
            color: 'var(--text-3)', minHeight: '52px',
          }}>{song.comingSoonLabel || 'Coming Soon'}</div>
        )}
      </div>
    </div>
  )
}

function SongCard({ song, onPreview }: { song: Song; onPreview: (song: Song) => void }) {
  const isActive = song.status === 'live' || song.status === 'active'

  return (
    <div style={{ cursor: 'pointer' }} onClick={() => onPreview(song)}>
      {/* Artwork */}
      <div style={{
        position: 'relative', aspectRatio: '1',
        borderRadius: '12px', overflow: 'hidden',
        marginBottom: '12px',
        opacity: isActive ? 1 : 0.4,
        filter: isActive ? 'none' : 'grayscale(60%)',
      }}>
        {song.artwork ? (
          <Image src={song.artwork} alt={song.title} fill style={{ objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--surface-2)' }} />
        )}
        {!isActive && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(7,6,10,0.6)',
          }}>
            <span style={{
              fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem',
              fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
              color: 'var(--gold)', padding: '6px 14px',
              border: '1px solid var(--gold-border)', borderRadius: '50px',
              background: 'var(--gold-faint)',
            }}>{song.comingSoonLabel || 'Coming Soon'}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.95rem', fontWeight: 600, color: isActive ? 'var(--text)' : 'var(--text-3)', marginBottom: '4px', lineHeight: 1.3 }}>{song.title}</p>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: '10px' }}>{song.artist}</p>

      {/* Metrics */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'var(--text-3)', letterSpacing: '0.5px' }}>
          {formatNum(song.plays || 0)} plays
        </span>
        {isActive && (
          <span style={{
            fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem',
            fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.5px',
          }}>
            {formatNum(song.lyricUses || 0)} lyric uses
          </span>
        )}
      </div>
    </div>
  )
}

export default function MusicPage() {
  const { songs, loading } = useSongs()
  const [preview, setPreview] = useState<Song | null>(null)
  const featuredSong = songs[0] || null
  const moreSongs = songs.slice(1)
  const { lines: sharedLines, loading: linesLoading } = useSharedLines(featuredSong?.title, featuredSong?.artist)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <MargoNav />
      <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--gold)', fontSize: '1rem' }}>Loading…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <MargoNav />

      {/* Preview overlay */}
      {preview && <SongPreview song={preview} onClose={() => setPreview(null)} />}

      {/* Hero — Featured Song */}
      {featuredSong && (
        <section style={{ position: 'relative', height: '85vh', minHeight: '600px', overflow: 'hidden' }}>
          {/* Background artwork */}
          {featuredSong.artwork && (
            <div style={{ position: 'absolute', inset: 0 }}>
              <Image src={featuredSong.artwork} alt={featuredSong.title} fill style={{ objectFit: 'cover' }} priority />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #07060A 0%, rgba(7,6,10,0.75) 50%, rgba(7,6,10,0.35) 100%)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(7,6,10,0.5) 0%, transparent 50%, rgba(7,6,10,0.5) 100%)' }} />
            </div>
          )}

          {/* Hero content */}
          <div style={{
            position: 'relative', height: '100%',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            padding: '0 24px 48px', maxWidth: '72rem', margin: '0 auto',
          }}>
            {/* Song info */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px', opacity: 0.8 }}>Featured</p>
              <h1 style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: 'clamp(3rem, 8vw, 6rem)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.05, marginBottom: '8px', letterSpacing: '-0.02em' }}>
                {featuredSong.title}
              </h1>
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', color: 'var(--text-2)', fontWeight: 400 }}>{featuredSong.artist}</p>
            </div>

            {/* Metrics */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginBottom: '32px' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{formatNum(featuredSong.plays || 0)}</p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>Plays</p>
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{formatNum(featuredSong.resonates || 0)}</p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>Resonates</p>
              </div>
              {/* Lyric Uses — the Margo metric */}
              <div style={{ paddingLeft: '32px', borderLeft: '1px solid var(--gold-border)' }}>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--gold)', lineHeight: 1 }}>{formatNum(featuredSong.lyricUses || 0)}</p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, color: 'var(--gold)', opacity: 0.7, letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>Lyric Uses</p>
              </div>
            </div>

            {/* Play CTA */}
            <Link href={`/music/player?id=${featuredSong.id}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              padding: '15px 32px', background: 'var(--gold)', color: 'var(--bg)',
              borderRadius: '50px', fontFamily: 'var(--font-lora), serif',
              fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1px',
              textTransform: 'uppercase', textDecoration: 'none',
              minHeight: '52px', width: 'fit-content',
              boxShadow: '0 6px 28px rgba(232,197,71,0.28)',
              transition: 'all 150ms ease',
            }}>
              ▶ Play Now
            </Link>
          </div>
        </section>
      )}

      {/* Most Shared Lines */}
      {featuredSong && (
        <section style={{ padding: '48px 24px', maxWidth: '72rem', margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '24px' }}>
            Most shared lines — {featuredSong.title}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {linesLoading && <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-3)', fontSize: '0.95rem', textAlign: 'center', padding: '32px' }}>Loading…</p>}
            {!linesLoading && sharedLines.length === 0 && (
              <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-3)', fontSize: '0.95rem', textAlign: 'center', padding: '32px' }}>
                No lines shared yet — be the first.
              </p>
            )}
            {sharedLines.map((lyric) => (
              <Link key={lyric.id} href="/compose" style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '20px 24px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                  transition: 'all 150ms ease',
                }}>
                  <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.6 }}>
                    &ldquo;{lyric.line}&rdquo;
                  </p>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)' }}>{lyric.uses}</p>
                    <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'var(--gold)', opacity: 0.7, letterSpacing: '1px', textTransform: 'uppercase' }}>uses</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Divider */}
      <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, var(--border), transparent)', margin: '0 24px' }} />

      {/* More Songs */}
      {moreSongs.length > 0 && (
        <section style={{ padding: '48px 24px', maxWidth: '72rem', margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '24px' }}>
            More Songs
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '24px' }}>
            {moreSongs.map(song => (
              <SongCard key={song.id} song={song} onPreview={setPreview} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
