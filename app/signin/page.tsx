'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { BackButton } from '@/components/back-button'

const font = 'var(--font-lora), serif'

export default function SigninPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signup' | 'signin'>('signin')

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      {/* Back button sits below the global nav's logo instead of colliding
          with it — the nav renders fixed at the top of every page via the
          root layout, so this needs its own clearance rather than pinning
          to the very top of the viewport. */}
      <div style={{ position: 'fixed', top: 'calc(var(--nav-height, 72px) + 8px)', left: '20px', zIndex: 60 }}>
        <BackButton fallbackHref="/" />
      </div>

      <style jsx>{`
        .signin-shell {
          min-height: 100dvh;
          display: grid;
          grid-template-columns: 1.1fr 1fr;
        }
        .signin-brand {
          display: flex;
        }
        @media (max-width: 860px) {
          .signin-shell {
            grid-template-columns: 1fr;
          }
          .signin-brand {
            display: none;
          }
        }
      `}</style>

      <div className="signin-shell">
        {/* Left panel — brand presence, desktop only. Reinforces Margo's
            music-first identity instead of leaving the sign-in moment as
            a generic centered void. */}
        <div
          className="signin-brand"
          style={{
            position: 'relative',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px',
            background: 'linear-gradient(160deg, rgba(232,197,71,0.05), transparent 60%)',
            borderRight: '1px solid var(--border)',
          }}
        >
          <div style={{ position: 'absolute', top: '20%', left: '10%', width: '320px', height: '320px', background: 'rgba(232,197,71,0.06)', borderRadius: '50%', filter: 'blur(90px)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', maxWidth: '440px' }}>
            <p style={{ fontFamily: font, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '4px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '32px' }}>
              Margo
            </p>
            <p style={{
              fontFamily: font, fontStyle: 'italic', fontSize: '2.1rem', lineHeight: 1.4,
              color: 'var(--text)', marginBottom: '24px',
            }}>
              &ldquo;I have got a thousand lives and I live them all for free&rdquo;
            </p>
            <p style={{ fontFamily: font, fontSize: '0.72rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              A Thousand Lives · TryMargo
            </p>
            <div style={{ height: '1px', width: '64px', background: 'var(--gold-border)', margin: '40px 0' }} />
            <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.7 }}>
              Communicate through music lyric. Share the words that move you, and find the people who feel the same way.
            </p>
          </div>
        </div>

        {/* Right panel — the actual form, given real breathing room instead
            of sitting in a plain centered box against black. */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '96px 24px 24px', position: 'relative',
        }}>
          <div style={{ position: 'absolute', bottom: '-120px', right: '-80px', width: '280px', height: '280px', background: 'rgba(232,197,71,0.04)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
          <div style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
            <AuthForm
              mode={mode}
              onSwitchMode={setMode}
              onSuccess={() => router.push('/feed')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}