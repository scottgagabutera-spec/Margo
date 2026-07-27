'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { MargoNav } from '@/components/margo-nav'

const font = 'var(--font-lora), serif'

interface ProfileData {
  id: string
  username: string
  displayName: string
  isArtist: boolean
  bio: string | null
  avatarUrl: string | null
  signatureLyric: string | null
  signatureSong: string | null
  signatureArtist: string | null
}

export default function ProfilePage() {
  const params = useParams<{ username: string }>()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setNotFound(false)
    supabase
      .from('profiles')
      .select('id, username, display_name, is_artist, bio, avatar_url, signature_lyric, signature_song, signature_artist')
      .eq('username', params.username)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error || !data) {
          setNotFound(true)
        } else {
          setProfile({
            id: data.id,
            username: data.username,
            displayName: data.display_name,
            isArtist: data.is_artist,
            bio: data.bio,
            avatarUrl: data.avatar_url,
            signatureLyric: data.signature_lyric,
            signatureSong: data.signature_song,
            signatureArtist: data.signature_artist,
          })
        }
        setLoading(false)
      })
    return () => { active = false }
  }, [params.username])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <MargoNav />
      <div style={{ position: 'relative', zIndex: 5, maxWidth: '560px', margin: '0 auto', padding: '120px 24px var(--margo-page-padding-bottom)' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '64px 0' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)', opacity: 0.5 }} />
            ))}
          </div>
        )}

        {!loading && notFound && (
          <p style={{ fontFamily: font, fontStyle: 'italic', color: 'var(--text-3)', textAlign: 'center', fontSize: '1rem' }}>
            No one here by that name.
          </p>
        )}

        {!loading && profile && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '96px', height: '96px', borderRadius: '50%', margin: '0 auto 20px',
              background: profile.avatarUrl ? 'none' : 'linear-gradient(135deg, var(--gold), var(--gold-2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontFamily: font, fontSize: '1.8rem', fontWeight: 700, color: 'var(--bg)' }}>
                  {(profile.displayName || '??').slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <h1 style={{ fontFamily: font, fontSize: '1.4rem', color: 'var(--text)', marginBottom: '4px' }}>
              {profile.displayName}
            </h1>
            <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: '16px' }}>
              @{profile.username}
            </p>

            {profile.isArtist && (
              <span style={{
                display: 'inline-block', marginBottom: '16px',
                fontFamily: font, fontSize: '0.55rem', fontWeight: 700,
                letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 10px',
                borderRadius: '50px', background: 'rgba(232,197,71,0.12)',
                border: '1px solid var(--gold-border)', color: 'var(--gold)',
              }}>Margo Artist</span>
            )}

            {profile.bio && (
              <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '24px' }}>
                {profile.bio}
              </p>
            )}

            {profile.signatureLyric && (
              <div style={{
                background: 'rgba(232,197,71,0.04)', border: '1px solid rgba(232,197,71,0.22)',
                borderRadius: '20px', padding: '24px', textAlign: 'center',
              }}>
                <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '1.15rem', color: 'var(--gold)', lineHeight: 1.5, marginBottom: '8px' }}>
                  &ldquo;{profile.signatureLyric}&rdquo;
                </p>
                {(profile.signatureSong || profile.signatureArtist) && (
                  <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {profile.signatureSong}{profile.signatureSong && profile.signatureArtist ? ' · ' : ''}{profile.signatureArtist}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}