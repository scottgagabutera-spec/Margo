'use client'
import Link from 'next/link'
import { MargoNav } from '@/components/margo-nav'

export default function AboutPage() {
  return (
    <>
      <MargoNav />
      <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.06, width: '500px', height: '500px', background: 'var(--gold)', top: '-100px', right: '-100px' }} />
        <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.06, width: '400px', height: '400px', background: '#6B4EFF', bottom: '-100px', left: '-100px' }} />

        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '88px 24px 120px', position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '16px' }}>About</div>

          <h1 style={{ fontFamily: 'var(--font-lora), serif', fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 700, color: 'var(--text)', lineHeight: 1.15, marginBottom: '12px' }}>
            Music is the language.<br />Margo is the space.
          </h1>

          <hr style={{ width: '48px', height: '2px', background: 'linear-gradient(90deg, var(--gold), transparent)', margin: '32px 0', border: 'none' }} />

          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--text-2)' }}>
            <p style={{ marginBottom: '1.4em' }}>People resonate with lyrics. They share them, replay them, send them. This has been happening everywhere for years. But there was never a place built for it.</p>
            <p style={{ marginBottom: '1.4em' }}>Margo is that place.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Post a lyric</h2>
            <p style={{ marginBottom: '1.4em' }}>Search a lyric, a song, or an artist name. Margo finds the song and links it to official streaming platforms so anyone can hear it where it lives. Pick the feeling behind it. Post it.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Resonate and reply</h2>
            <p style={{ marginBottom: '1.4em' }}>Others who feel it can resonate with one tap. Or they reply with their own lyric and their own feeling. That reply is a Lyric Back. The whole conversation stays in music.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Share it anywhere</h2>
            <p style={{ marginBottom: '1.4em' }}>Every post and every Lyric Back can be saved as a visual card, copied as text, or shared as a link that opens Margo directly on that exchange.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Original music</h2>
            <p style={{ marginBottom: '1.4em' }}>Margo also creates original music — commercially licensed and available on all major streaming platforms.</p>
            <p style={{ marginBottom: '1.4em' }}>Built independently. If this resonates, <Link href="/contact" style={{ color: 'var(--gold)', textDecoration: 'none' }}>get in touch</Link>.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Where we are going</h2>
            <p style={{ marginBottom: '1.4em' }}>Margo is evolving. What you see today is the beginning — the platform will grow to do more. We encourage you to check back here periodically as features, partnerships, and capabilities expand.</p>
          </div>

          <div style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '1.5rem', fontWeight: 400, color: 'var(--gold)', marginTop: '48px', opacity: 0.9, lineHeight: 1.4 }}>
            When words fail, drop a lyric.
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '64px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
            {['about', 'privacy', 'terms', 'contact'].map(p => (
              <Link key={p} href={`/${p}`} style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)', textDecoration: 'none' }}>{p}</Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
