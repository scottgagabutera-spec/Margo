'use client'
import { useState, useEffect } from 'react'
import { useUsername } from '@/hooks/useUsername'
import { useClaimIdentity } from '@/hooks/useClaimIdentity'

const font = 'var(--font-lora), serif'

export function ClaimIdentityBanner() {
  const { username, hasConfirmed } = useUsername()
  const { user, profile, loading, claimIdentity, claiming } = useClaimIdentity()
  const [dismissed, setDismissed] = useState(true) // default hidden until we check localStorage
  const [error, setError] = useState('')
  const [claimed, setClaimed] = useState(false)

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem('margoClaimBannerDismissed') === 'true')
    } catch {
      setDismissed(false)
    }
  }, [])

  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem('margoClaimBannerDismissed', 'true') } catch {}
  }

  const handleClaim = async () => {
    setError('')
    const result = await claimIdentity(username)
    if (result.success) {
      setClaimed(true)
      setTimeout(dismiss, 1800)
    } else {
      setError(result.error || 'Could not claim right now.')
    }
  }

  // Don't show while auth state is still resolving, if already claimed,
  // if dismissed, or before the person has confirmed their name at all
  if (loading || (user && profile) || dismissed || !hasConfirmed) return null

  return (
    <div style={{
      maxWidth: '720px', margin: '0 auto 20px', padding: '16px 20px',
      background: 'rgba(232,197,71,0.06)', border: '1px solid rgba(232,197,71,0.2)',
      borderRadius: '16px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: '200px' }}>
        {claimed ? (
          <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--gold)' }}>
            {username} is yours now.
          </p>
        ) : (
          <>
            <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text)', marginBottom: '2px' }}>
              Make <strong style={{ color: 'var(--gold)' }}>{username}</strong> permanently yours
            </p>
            <p style={{ fontFamily: font, fontSize: '0.72rem', color: 'var(--text-3)' }}>
              Claim it so people can find and follow you on Margo.
            </p>
            {error && (
              <p style={{ fontFamily: font, fontSize: '0.7rem', color: '#ff6060', marginTop: '6px' }}>{error}</p>
            )}
          </>
        )}
      </div>
      {!claimed && (
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={handleClaim}
            disabled={claiming}
            style={{
              minHeight: '44px', padding: '0 20px', boxSizing: 'border-box',
              background: 'var(--gold)', color: 'var(--bg)', border: 'none',
              borderRadius: '50px', fontFamily: font, fontWeight: 700,
              fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase',
              cursor: claiming ? 'not-allowed' : 'pointer', opacity: claiming ? 0.6 : 1,
            }}
          >
            {claiming ? 'Claiming…' : 'Claim It'}
          </button>
          <button
            onClick={dismiss}
            style={{
              minHeight: '44px', minWidth: '44px', padding: '0 16px', boxSizing: 'border-box',
              background: 'transparent', color: 'var(--text-3)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50px', fontFamily: font, fontSize: '0.6rem',
              letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Not Now
          </button>
        </div>
      )}
    </div>
  )
}