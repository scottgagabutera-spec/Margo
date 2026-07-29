'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useIdentity } from '@/hooks/useIdentity'

const font = 'var(--font-lora), serif'

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: font, fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-3)',
  textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px',
}

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
  const { identity } = useIdentity()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [followerCount, setFollowerCount] = useState<number | null>(null)
  const [followingCount, setFollowingCount] = useState<number | null>(null)

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
          setLoading(false)
          return
        }
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
        setLoading(false)

        // Followers/following counts, scoped to accepted follows only —
        // pending requests shouldn't inflate either number.
        Promise.all([
          supabase.from('follows').select('*', { count: 'exact', head: true })
            .eq('followee_id', data.id).eq('status', 'accepted'),
          supabase.from('follows').select('*', { count: 'exact', head: true })
            .eq('follower_id', data.id).eq('status', 'accepted'),
        ]).then(([followers, following]) => {
          if (!active) return
          setFollowerCount(followers.count ?? 0)
          setFollowingCount(following.count ?? 0)
        })
      })
    return () => { active = false }
  }, [params.username])

  const isOwnProfile = !!identity && !!profile && identity.username === profile.username

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
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
          <div>
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
              <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: '12px' }}>
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

              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '20px' }}>
                <span style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text-2)' }}>
                  <strong style={{ color: 'var(--text)' }}>{followerCount ?? '—'}</strong> followers
                </span>
                <span style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text-2)' }}>
                  <strong style={{ color: 'var(--text)' }}>{followingCount ?? '—'}</strong> following
                </span>
              </div>

              {isOwnProfile ? (
                <div style={{ marginBottom: '28px' }}>
                  <Link
                    href="/profile/edit"
                    style={{
                      minHeight: 'var(--margo-touch-min)', padding: '0 24px',
                      display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
                      background: 'var(--surface-2)', color: 'var(--text-2)',
                      border: '1px solid var(--border)', borderRadius: '50px',
                      fontFamily: font, fontWeight: 600, fontSize: '0.95rem',
                      textDecoration: 'none', cursor: 'pointer',
                    }}
                  >Edit Profile</Link>
                </div>
              ) : (
                <div style={{ marginBottom: '28px' }}>
                  <button
                    type="button"
                    style={{
                      minHeight: 'var(--margo-touch-min)', padding: '0 28px',
                      display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
                      background: 'var(--gold)', color: 'var(--bg)', border: 'none',
                      borderRadius: '50px', fontFamily: font, fontWeight: 700, fontSize: '0.95rem',
                      cursor: 'pointer',
                    }}
                  >Follow</button>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
              <p style={sectionLabelStyle}>Bio</p>
              {profile.bio ? (
                <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                  {profile.bio}
                </p>
              ) : isOwnProfile ? (
                <Link href="/profile/edit" style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-3)', fontStyle: 'italic', textDecoration: 'none' }}>
                  Add a bio →
                </Link>
              ) : (
                <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
                  No bio yet.
                </p>
              )}
            </div>

            <div style={{
              background: 'rgba(232,197,71,0.04)', border: '1px solid rgba(232,197,71,0.22)',
              borderRadius: '20px', padding: '24px', textAlign: 'center',
            }}>
              <p style={sectionLabelStyle}>Signature Lyric</p>
              {profile.signatureLyric ? (
                <>
                  <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '1.15rem', color: 'var(--gold)', lineHeight: 1.5, marginBottom: '8px' }}>
                    &ldquo;{profile.signatureLyric}&rdquo;
                  </p>
                  {(profile.signatureSong || profile.signatureArtist) && (
                    <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      {profile.signatureSong}{profile.signatureSong && profile.signatureArtist ? ' · ' : ''}{profile.signatureArtist}
                    </p>
                  )}
                </>
              ) : isOwnProfile ? (
                <Link href="/profile/edit" style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-3)', fontStyle: 'italic', textDecoration: 'none' }}>
                  Add the lyric that says it best →
                </Link>
              ) : (
                <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
                  Hasn&rsquo;t picked one yet.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}