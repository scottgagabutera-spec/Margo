'use client'

import Link from 'next/link'
import { useIdentity } from '@/hooks/useIdentity'
import { BackButton } from '@/components/back-button'

const font = 'var(--font-geist-sans), system-ui, sans-serif'

/**
 * Library stub — Listen Later / Liked / Playlists land here as Phase D ships.
 * Hub Library tile + top-bar Library icon navigate here. Badge stays 0 until
 * a real "new" signal exists.
 */
export default function LibraryPage() {
  const { user, identity, loading } = useIdentity()
  const isSignedIn = !!user && !user.isAnonymous

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: 'calc(var(--nav-height, 72px) + 24px) 20px var(--margo-page-padding-bottom)',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <BackButton fallbackHref="/feed" />
        </div>

        <h1 style={{
          fontFamily: 'var(--font-lora), serif',
          fontStyle: 'italic',
          fontSize: '1.5rem',
          color: 'var(--text)',
          margin: '0 0 8px',
        }}>
          Library
        </h1>
        <p style={{
          fontFamily: font,
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          margin: '0 0 28px',
          lineHeight: 1.5,
        }}>
          Your Listen Later, liked songs, and playlists will live here.
        </p>

        {loading ? (
          <p style={{ fontFamily: font, color: 'var(--text-muted)' }}>Loading…</p>
        ) : !isSignedIn ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{
              fontFamily: 'var(--font-lora), serif',
              fontStyle: 'italic',
              color: 'var(--text-secondary)',
              marginBottom: '16px',
            }}>
              Sign in to open your library
            </p>
            <Link href="/signin" style={{
              padding: '10px 24px',
              border: '1px solid var(--border)',
              borderRadius: '50px',
              color: 'var(--text-secondary)',
              fontFamily: font,
              fontSize: '0.6rem',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}>
              Sign In
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { title: 'Listen Later', body: 'Songs you want to play soon.' },
              { title: 'Liked', body: 'Tracks you resonated with.' },
              { title: 'Playlists', body: 'Your mixes and saved queues.' },
            ].map((row) => (
              <div
                key={row.title}
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <p style={{
                  fontFamily: font,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--text)',
                  margin: '0 0 4px',
                }}>
                  {row.title}
                </p>
                <p style={{
                  fontFamily: font,
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  margin: 0,
                }}>
                  {row.body}
                  {identity?.username ? ` · Coming soon for @${identity.username}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
