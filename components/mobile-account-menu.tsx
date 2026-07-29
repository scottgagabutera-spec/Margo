'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { useIdentity } from '@/hooks/useIdentity'
import { useArtistApplication } from '@/hooks/useArtistApplication'
import { supabase } from '@/lib/supabase'

const font = 'var(--font-lora), serif'

export function MobileAccountMenu() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const { user, identity } = useIdentity()
  const { application } = useArtistApplication()

  const isSignedIn = !!user && !user.isAnonymous
  const applicationStatus = application?.status ?? 'none'
  const showApplyCTA = isSignedIn && !identity?.isArtist
  const applyLabel =
    applicationStatus === 'pending' ? 'Application Pending' :
    applicationStatus === 'rejected' ? 'Reapply as Artist' :
    'Apply as an Artist'

  const ownProfileHref = identity ? `/profile/${identity.username}` : null

  const handleSignOut = async () => {
    setOpen(false)
    await supabase.auth.signOut()
  }

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  if (!isSignedIn || !ownProfileHref) return null

  const items = [
    { href: ownProfileHref, label: 'Profile' },
    { href: '/settings', label: 'Account Settings' },
    ...(showApplyCTA ? [{ href: '/apply-artist', label: applyLabel }] : []),
  ]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Account Settings"
        className="margo-mobile-account-trigger"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          minHeight: 'var(--margo-touch-min)', padding: '0 14px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
          borderRadius: '50px', cursor: 'pointer', boxSizing: 'border-box',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="2.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
          <path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.05 4.95l-1.4 1.4M6.35 13.65l-1.4 1.4M15.05 15.05l-1.4-1.4M6.35 6.35l-1.4-1.4"
            stroke="rgba(255,255,255,0.6)" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <span style={{
          fontFamily: font, fontSize: '0.65rem', fontWeight: 600,
          letterSpacing: '1px', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.6)',
        }}>Account Settings</span>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 70,
            background: 'rgba(0,0,0,0.6)',
          }}
        >
          <div
            ref={sheetRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'var(--bg)',
              borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
              padding: '8px 12px calc(20px + env(safe-area-inset-bottom))',
            }}
          >
            <div style={{
              width: '36px', height: '4px', borderRadius: '2px',
              background: 'rgba(255,255,255,0.15)', margin: '4px auto 12px',
            }} />

            {items.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center',
                  minHeight: 'var(--margo-touch-min)',
                  fontFamily: font, fontSize: '0.9rem',
                  textDecoration: 'none',
                  color: pathname === href ? 'var(--gold)' : 'var(--text)',
                  padding: '0 12px', borderRadius: '8px',
                  boxSizing: 'border-box',
                }}
              >
                {label}
              </Link>
            ))}

            <div style={{ height: '1px', background: 'var(--border)', margin: '8px 4px' }} />

            <button
              type="button"
              onClick={handleSignOut}
              style={{
                display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left',
                minHeight: 'var(--margo-touch-min)',
                fontFamily: font, fontSize: '0.9rem',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.5)',
                padding: '0 12px', borderRadius: '8px',
                boxSizing: 'border-box',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 640px) {
          .margo-mobile-account-trigger { display: none !important; }
        }
      `}</style>
    </>
  )
}