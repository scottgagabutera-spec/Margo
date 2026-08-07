'use client'
import Link from 'next/link'

export default function ContactPage() {
  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.06, width: '500px', height: '500px', background: 'var(--gold)', top: '-100px', right: '-100px' }} />
        <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.06, width: '400px', height: '400px', background: '#6B4EFF', bottom: '-100px', left: '-100px' }} />

        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '88px 24px 120px', position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '16px' }}>Contact</div>

          <h1 style={{ fontFamily: 'var(--font-lora), serif', fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 700, color: 'var(--text)', lineHeight: 1.15, marginBottom: '12px' }}>
            Get in touch.
          </h1>

          <hr style={{ width: '48px', height: '2px', background: 'linear-gradient(90deg, var(--gold), transparent)', margin: '32px 0', border: 'none' }} />

          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--text-2)', marginBottom: '32px' }}>
            We read everything and respond to what matters.
          </p>

          <div style={{ background: 'rgba(232,197,71,0.04)', border: '1px solid rgba(232,197,71,0.12)', borderRadius: '12px', padding: '28px', marginBottom: '16px' }}>
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>General</div>
              <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1rem', color: 'var(--text-2)', marginBottom: '4px' }}>
                <a href="mailto:contact@trymargo.com" style={{ color: 'var(--gold)', textDecoration: 'none' }}>contact@trymargo.com</a>
              </div>
              <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Questions, feedback, partnerships, press.</div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Copyright and Legal</div>
              <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1rem', color: 'var(--text-2)', marginBottom: '4px' }}>
                <a href="mailto:dmca@trymargo.com" style={{ color: 'var(--gold)', textDecoration: 'none' }}>dmca@trymargo.com</a>
                {' · '}
                <Link href="/dmca" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Copyright Policy</Link>
              </div>
              <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>DMCA notices, counter-notices, and rights-holder requests.</div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Investors and Partners</div>
              <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1rem', color: 'var(--text-2)', marginBottom: '4px' }}>
                <a href="mailto:contact@trymargo.com" style={{ color: 'var(--gold)', textDecoration: 'none' }}>contact@trymargo.com</a>
              </div>
              <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Margo is independently built and actively seeking partners and investors who see this early.</div>
            </div>


            <div style={{ marginTop: '32px' }}>
              <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>LinkedIn</div>
              <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1rem', color: 'var(--text-2)' }}>
                <a href="https://linkedin.com/company/trymargo" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none' }}>linkedin.com/company/trymargo</a>
              </div>
            </div>
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
