'use client'
import Link from 'next/link'
import { BackButton } from '@/components/back-button'

export default function AboutPage() {
  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.06, width: '500px', height: '500px', background: 'var(--gold)', top: '-100px', right: '-100px' }} />
        <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.06, width: '400px', height: '400px', background: '#6B4EFF', bottom: '-100px', left: '-100px' }} />

        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '88px 24px 120px', position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: '16px' }}>
            <BackButton fallbackHref="/" />
          </div>
          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '16px' }}>About</div>

          <h1 style={{ fontFamily: 'var(--font-lora), serif', fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 700, color: 'var(--text)', lineHeight: 1.15, marginBottom: '12px' }}>
            Music is the language.<br />Margo is the space.
          </h1>

          <hr style={{ width: '48px', height: '2px', background: 'linear-gradient(90deg, var(--gold), transparent)', margin: '32px 0', border: 'none' }} />

          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--text-2)' }}>
            <p style={{ marginBottom: '1.4em' }}>People have always talked in lyrics. Shared them, saved them, sent them when plain words weren't enough.</p>
            <p style={{ marginBottom: '1.4em' }}>Margo is a music first social space built for that. A place where conversation starts with a line from a song.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Talk in lyrics</h2>
            <p style={{ marginBottom: '1.4em' }}>Post a lyric. Tag the feeling behind it. Resonate when someone else's line hits. Reply with a Lyric Back so the conversation stays in music. Replay what stays with you.</p>
            <p style={{ marginBottom: '1.4em' }}>When you find something worth keeping, export a card, copy the text, or share a link back to Margo.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>A real social space</h2>
            <p style={{ marginBottom: '1.4em' }}>Margo is built around people, profiles, and connections. Anonymity isn't the product.</p>
            <p style={{ marginBottom: '1.4em' }}>Follow people you vibe with. Keep your account private if you want. Message when someone lets you. Choose your username and make your profile yours.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Listen here</h2>
            <p style={{ marginBottom: '1.4em' }}>Margo isn't only a place to talk about music.</p>
            <p style={{ marginBottom: '1.4em' }}>Discover and play music hosted on Margo. Browse tracks, open an artist, and listen in app when the music lives here.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>Music on Margo</h2>
            <p style={{ marginBottom: '1.4em' }}>Music comes to Margo in a few ways.</p>
            <p style={{ marginBottom: '1.4em' }}><strong style={{ color: 'var(--text)' }}>Margo Originals</strong><br />Music we publish as our own.</p>
            <p style={{ marginBottom: '1.4em' }}><strong style={{ color: 'var(--text)' }}>Independent and approved artists</strong><br />Creators who apply, get approved, and share their music directly with the community through Studio, including AI-assisted artists who retain their commercial rights.</p>
            <p style={{ marginBottom: '1.4em' }}><strong style={{ color: 'var(--text)' }}>Redirect only</strong><br />Posts and moments that send you elsewhere to listen when we don't host the full track.</p>
            <p style={{ marginBottom: '1.4em' }}>Different paths, one place for music.</p>

            <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', margin: '2.4em 0 0.8em' }}>For artists</h2>
            <p style={{ marginBottom: '1.4em' }}>Margo is for the people making the music, too.</p>
            <p style={{ marginBottom: '1.4em' }}>Apply to become an artist. Once approved, use Studio to upload and manage your music on Margo.</p>
            <p style={{ marginBottom: '1.4em' }}>We're building a roster of independent artists alongside Margo's own releases. A place where creators can put their music in the same space where people are already talking about it. If this resonates, <Link href="/contact" style={{ color: 'var(--gold)', textDecoration: 'none' }}>get in touch</Link>.</p>
          </div>

          <div style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '1.5rem', fontWeight: 400, color: 'var(--gold)', marginTop: '48px', opacity: 0.9, lineHeight: 1.4 }}>
            Warm. Intimate. A little personal.<br />Like finding the exact line that says what you couldn't.<br />When words fail, drop a lyric.
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '64px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
            {['about', 'privacy', 'terms', 'dmca', 'contact'].map(p => (
              <Link key={p} href={`/${p}`} style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', textDecoration: 'none' }}>{p}</Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}