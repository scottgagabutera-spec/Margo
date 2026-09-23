'use client'

import Link from 'next/link'

const font = 'var(--font-lora), serif'
const pStyle: React.CSSProperties = { marginBottom: '1.4em' }
const linkStyle: React.CSSProperties = { color: 'var(--gold)', textDecoration: 'none' }
const h2Style: React.CSSProperties = {
  fontFamily: font,
  fontSize: '1.15rem',
  fontWeight: 600,
  fontStyle: 'italic',
  color: 'var(--text)',
  margin: '2.4em 0 0.8em',
}
const ulStyle: React.CSSProperties = { paddingLeft: '20px', marginBottom: '1.4em' }
const liStyle: React.CSSProperties = { marginBottom: '0.5em' }

const FOOTER_LINKS = ['help', 'faq', 'about', 'privacy', 'terms', 'dmca', 'data-deletion', 'contact'] as const

export default function DataDeletionPage() {
  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.06, width: '500px', height: '500px', background: 'var(--gold)', top: '-100px', right: '-100px' }} />
        <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 0, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.06, width: '400px', height: '400px', background: '#6B4EFF', bottom: '-100px', left: '-100px' }} />

        <div style={{ maxWidth: '680px', margin: '0 auto', padding: 'calc(var(--nav-height, 72px) + 16px) 24px 120px', position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: font, fontSize: '0.6rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '16px' }}>
            User Data
          </div>

          <h1 style={{ fontFamily: font, fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 700, color: 'var(--text)', lineHeight: 1.15, marginBottom: '12px' }}>
            Account &amp;<br />data deletion.
          </h1>
          <div style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '32px' }}>
            Last updated: September 2026
          </div>

          <hr style={{ width: '48px', height: '2px', background: 'linear-gradient(90deg, var(--gold), transparent)', margin: '32px 0', border: 'none' }} />

          <div style={{ fontFamily: font, fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--text-2)' }}>
            <p style={pStyle}>
              This page explains how to request deletion of your personal account data on Margo.
              It is <strong style={{ color: 'var(--text)', fontWeight: 600 }}>not</strong> for copyright
              complaints — those go to our{' '}
              <Link href="/dmca" style={linkStyle}>Copyright / DMCA Policy</Link>.
            </p>

            <h2 style={h2Style}>Delete your Margo account (recommended)</h2>
            <p style={pStyle}>
              If you have a Margo account, the fastest way to delete your personal data is in the app:
            </p>
            <ol style={ulStyle}>
              <li style={liStyle}>Sign in at <Link href="https://trymargo.com/signin" style={linkStyle}>trymargo.com/signin</Link></li>
              <li style={liStyle}>Open <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Settings</strong></li>
              <li style={liStyle}>Scroll to <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Delete your account</strong></li>
              <li style={liStyle}>Confirm permanent deletion</li>
            </ol>
            <p style={pStyle}>
              Permanent deletion removes your profile, posts, messages, follow relationships, uploaded songs,
              and associated engagement data from our active systems, as described in our{' '}
              <Link href="/privacy" style={linkStyle}>Privacy Policy</Link>.
              Login credentials are removed and cannot be recovered.
            </p>

            <h2 style={h2Style}>Request deletion by email</h2>
            <p style={pStyle}>
              If you cannot sign in, or you need help with a deletion request, email us from the address
              associated with your account:
            </p>
            <p style={pStyle}>
              <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Privacy &amp; data deletion:</strong>{' '}
              <a href="mailto:hello@trymargo.com?subject=Margo%20data%20deletion%20request" style={linkStyle}>hello@trymargo.com</a>
              <br />
              <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Account support:</strong>{' '}
              <a href="mailto:support@trymargo.com?subject=Margo%20data%20deletion%20request" style={linkStyle}>support@trymargo.com</a>
            </p>
            <p style={pStyle}>
              Include the username or email on your account. We may ask you to verify identity before completing
              the request. We aim to respond within 30 days.
            </p>

            <h2 style={h2Style}>Facebook Login &amp; connected Pages</h2>
            <p style={pStyle}>
              If you connected a Facebook Page for Auto-Promote, you can disconnect it anytime in{' '}
              <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Settings → Connected accounts</strong>{' '}
              without deleting your whole Margo account. Deleting your Margo account also removes stored
              Facebook connection tokens from our database.
            </p>
            <p style={pStyle}>
              To revoke Margo&apos;s access on Facebook itself, open Facebook →{' '}
              <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Settings &amp; privacy → Settings → Apps and websites</strong>,
              find Margo, and remove it.
            </p>

            <h2 style={h2Style}>What we may retain</h2>
            <p style={pStyle}>
              We may retain limited information where required by law, to resolve disputes, enforce our agreements,
              prevent abuse, or because copies remain temporarily in secure backups until overwritten in the ordinary
              backup cycle. See Section 6 of our{' '}
              <Link href="/privacy" style={linkStyle}>Privacy Policy</Link> for details.
            </p>

            <h2 style={h2Style}>Contact</h2>
            <ul style={ulStyle}>
              <li style={liStyle}>
                <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Privacy / personal data:</strong>{' '}
                <a href="mailto:hello@trymargo.com" style={linkStyle}>hello@trymargo.com</a>
              </li>
              <li style={liStyle}>
                <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Copyright / DMCA:</strong>{' '}
                <a href="mailto:dmca@trymargo.com" style={linkStyle}>dmca@trymargo.com</a> ·{' '}
                <Link href="/dmca" style={linkStyle}>DMCA Policy</Link>
              </li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '64px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
            {FOOTER_LINKS.map((p) => (
              <Link key={p} href={`/${p}`} style={{ fontFamily: font, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', textDecoration: 'none' }}>{p.replace('data-deletion', 'data deletion')}</Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
