'use client'
import Link from 'next/link'
import { BackButton } from '@/components/back-button'

const font = 'var(--font-lora), serif'
const pStyle: React.CSSProperties = { marginBottom: '1.4em' }
const linkStyle: React.CSSProperties = { color: 'var(--gold)', textDecoration: 'none' }
const categoryLabelStyle: React.CSSProperties = {
  fontFamily: font,
  fontSize: '0.6rem',
  fontWeight: 600,
  letterSpacing: '2px',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: '8px',
}
const categoryDescStyle: React.CSSProperties = {
  fontFamily: font,
  fontSize: '0.82rem',
  color: 'var(--text-secondary)',
  lineHeight: 1.5,
  marginTop: '4px',
}
const panelStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '28px',
  marginBottom: '16px',
}

type ContactCategory = {
  label: string
  email: string
  description: React.ReactNode
}

const categories: ContactCategory[] = [
  {
    label: 'General',
    email: 'hello@trymargo.com',
    description: <>Questions, feedback, and anything that doesn&apos;t fit the categories below.</>,
  },
  {
    label: 'Account & Studio support',
    email: 'support@trymargo.com',
    description: <>Help with your account, posts, or Studio.</>,
  },
  {
    label: 'Privacy & personal data',
    email: 'hello@trymargo.com',
    description: (
      <>
        Requests about your personal data or how we handle it. See our{' '}
        <Link href="/privacy" style={linkStyle}>Privacy Policy</Link>.
      </>
    ),
  },
  {
    label: 'Copyright / DMCA',
    email: 'dmca@trymargo.com',
    description: (
      <>
        Copyright infringement notices and related legal claims. Send DMCA notices here &mdash; not to the general inbox. See{' '}
        <Link href="/dmca" style={linkStyle}>Copyright / DMCA Policy</Link>.
      </>
    ),
  },
  {
    label: 'Investors',
    email: 'investors@trymargo.com',
    description: <>Investor inquiries.</>,
  },
]

export default function ContactPage() {
  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.06, width: '500px', height: '500px', background: 'var(--gold)', top: '-100px', right: '-100px' }} />
        <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.06, width: '400px', height: '400px', background: '#6B4EFF', bottom: '-100px', left: '-100px' }} />

        <div style={{ maxWidth: '680px', margin: '0 auto', padding: 'calc(var(--nav-height, 72px) + 16px) 24px 120px', position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: '16px' }}>
            <BackButton fallbackHref="/" />
          </div>
          <div style={{ fontFamily: font, fontSize: '0.6rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '16px' }}>Contact</div>

          <h1 style={{ fontFamily: font, fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 700, color: 'var(--text)', lineHeight: 1.15, marginBottom: '12px' }}>
            Get in touch.
          </h1>

          <hr style={{ width: '48px', height: '2px', background: 'linear-gradient(90deg, var(--gold), transparent)', margin: '32px 0', border: 'none' }} />

          <div style={{ fontFamily: font, fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--text-2)' }}>
            <p style={pStyle}>
              Reach the right inbox for what you need. We read everything and respond when we can.
            </p>

            <div style={panelStyle}>
              {categories.map((cat, i) => (
                <div
                  key={cat.label}
                  style={{ marginBottom: i === categories.length - 1 ? 0 : '32px' }}
                >
                  <div style={categoryLabelStyle}>{cat.label}</div>
                  <div style={{ fontFamily: font, fontSize: '1rem', color: 'var(--text-2)' }}>
                    <a href={`mailto:${cat.email}`} style={linkStyle}>{cat.email}</a>
                  </div>
                  <div style={categoryDescStyle}>{cat.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '64px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
            {['about', 'privacy', 'terms', 'dmca', 'contact'].map(p => (
              <Link key={p} href={`/${p}`} style={{ fontFamily: font, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', textDecoration: 'none' }}>{p}</Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
