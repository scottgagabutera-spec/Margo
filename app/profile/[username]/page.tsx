'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useIdentity } from '@/hooks/useIdentity'
import { useArtistApplication } from '@/hooks/useArtistApplication'
import { usePosts } from '@/hooks/usePosts'

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
  isPrivate: boolean
}

type FollowStatus = null | 'pending' | 'accepted'

export default function ProfilePage() {
  const params = useParams<{ username: string }>()
  const { user, identity } = useIdentity()
  const { application } = useArtistApplication()
  const { posts } = usePosts()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [followerCount, setFollowerCount] = useState<number | null>(null)
  const [followingCount, setFollowingCount] = useState<number | null>(null)
  const [followStatus, setFollowStatus] = useState<FollowStatus>(null)
  const [followBusy, setFollowBusy] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setNotFound(false)
    supabase
      .from('profiles')
      .select('id, username, display_name, is_artist, bio, avatar_url, signature_lyric, signature_song, signature_artist, is_private')
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
          isPrivate: !!data.is_private,
        })
        setLoading(false)

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

  // Look up the viewer's own relationship to this profile — separate
  // from the aggregate counts above, since this is specific to the
  // signed-in viewer, not the profile being viewed.
  useEffect(() => {
    if (!user || !profile || isOwnProfile) { setFollowStatus(null); return }
    let active = true
    supabase
      .from('follows')
      .select('status')
      .eq('follower_id', user.id)
      .eq('followee_id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        setFollowStatus(data ? (data.status as FollowStatus) : null)
      })
    return () => { active = false }
  }, [user, profile, isOwnProfile])

  const ownPosts = useMemo(
    () => profile ? posts.filter(p => p.authorUid === profile.id) : [],
    [posts, profile]
  )

  // Giants-style privacy: identity (avatar, name, bio, counts) always
  // shows. Content (their lyrics) is locked to non-followers on a
  // private profile — owner and accepted followers see it, everyone
  // else sees a locked message instead of the actual posts.
  const canViewContent = !profile?.isPrivate || isOwnProfile || followStatus === 'accepted'

  const applicationStatus = application?.status ?? 'none'
  const showApplyCTA = isOwnProfile && !identity?.isArtist
  const applyLabel =
    applicationStatus === 'pending' ? 'Application pending' :
    applicationStatus === 'rejected' ? 'Reapply as artist' :
    'Apply as an artist'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  // Mutual-accept follow model: a first click sends a request. The
  // database (set_follow_status trigger) decides the actual resulting
  // status — 'accepted' immediately for public profiles, 'pending' for
  // private ones — so the client reads back what the trigger set
  // rather than assuming 'pending'. Clicking again while pending
  // cancels the request; clicking while already accepted unfollows.
  // There's no accept/decline inbox for incoming requests yet on this
  // page — that lives in notifications.
  const handleFollowClick = async () => {
    if (!user || !profile || followBusy) return
    setFollowBusy(true)
    try {
      if (followStatus === null) {
        const { data, error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            followee_id: profile.id,
          })
          .select('status')
          .single()
        if (!error && data) {
          const resultStatus = data.status as FollowStatus
          setFollowStatus(resultStatus)
          if (resultStatus === 'accepted') {
            setFollowerCount(c => (c !== null ? c + 1 : c))
          }
        }
      } else {
        const { error } = await supabase.from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('followee_id', profile.id)
        if (!error) {
          if (followStatus === 'accepted') {
            setFollowerCount(c => (c !== null ? Math.max(0, c - 1) : c))
          }
          setFollowStatus(null)
        }
      }
    } finally {
      setFollowBusy(false)
    }
  }

  const followLabel =
    followStatus === 'accepted' ? 'Following' :
    followStatus === 'pending' ? 'Requested' :
    'Follow'

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '160px 0' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)', opacity: 0.5 }} />
          ))}
        </div>
      )}

      {!loading && notFound && (
        <p style={{ fontFamily: font, fontStyle: 'italic', color: 'var(--text-3)', textAlign: 'center', fontSize: '1rem', paddingTop: '160px' }}>
          No one here by that name.
        </p>
      )}

      {!loading && profile && (
        <div>
          <div style={{
            height: '160px', width: '100%',
            background: 'linear-gradient(135deg, rgba(232,197,71,0.14), rgba(122,127,214,0.08) 60%, var(--bg))',
          }} />

          <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 24px var(--margo-page-padding-bottom)' }}>
            <div style={{ marginTop: '-44px', marginBottom: '20px' }}>
              <div style={{
                width: '88px', height: '88px', borderRadius: '50%',
                background: profile.avatarUrl ? 'none' : 'linear-gradient(135deg, var(--gold), var(--gold-2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                border: '4px solid var(--bg)', boxSizing: 'border-box',
              }}>
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontFamily: font, fontSize: '1.6rem', fontWeight: 700, color: 'var(--bg)' }}>
                    {(profile.displayName || '??').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h1 style={{ fontFamily: font, fontSize: '1.4rem', color: 'var(--text)' }}>
                    {profile.displayName}
                  </h1>
                  {profile.isPrivate && (
                    <span style={{
                      fontFamily: font, fontSize: '0.55rem', fontWeight: 700,
                      letterSpacing: '1px', textTransform: 'uppercase', padding: '3px 8px',
                      borderRadius: '50px', background: 'var(--surface-2)',
                      border: '1px solid var(--border)', color: 'var(--text-3)',
                    }}>Private</span>
                  )}
                </div>
                <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-3)' }}>
                  @{profile.username}
                </p>
              </div>

              {isOwnProfile && (
                <Link
                  href="/profile/edit"
                  style={{
                    minHeight: 'var(--margo-touch-min)', padding: '0 22px',
                    display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
                    background: 'var(--surface-2)', color: 'var(--text-2)',
                    border: '1px solid var(--border)', borderRadius: '50px',
                    fontFamily: font, fontWeight: 600, fontSize: '0.9rem',
                    textDecoration: 'none', cursor: 'pointer', flexShrink: 0,
                  }}
                >Edit Profile</Link>
              )}

              {!isOwnProfile && user && (
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <Link
                    href={`/messages/${profile.username}`}
                    style={{
                      minHeight: 'var(--margo-touch-min)', padding: '0 22px',
                      display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
                      background: 'transparent', color: 'var(--text-2)',
                      border: '1px solid var(--border)', borderRadius: '50px',
                      fontFamily: font, fontWeight: 700, fontSize: '0.9rem',
                      textDecoration: 'none', cursor: 'pointer',
                    }}
                  >Message</Link>
                  <button
                    type="button"
                    onClick={handleFollowClick}
                    disabled={followBusy}
                    style={{
                      minHeight: 'var(--margo-touch-min)', padding: '0 26px',
                      display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
                      background: followStatus ? 'transparent' : 'var(--gold)',
                      color: followStatus ? 'var(--text-2)' : 'var(--bg)',
                      border: followStatus ? '1px solid var(--border)' : 'none',
                      borderRadius: '50px', fontFamily: font, fontWeight: 700, fontSize: '0.9rem',
                      cursor: followBusy ? 'not-allowed' : 'pointer',
                      opacity: followBusy ? 0.7 : 1,
                    }}
                  >{followLabel}</button>
                </div>
              )}
            </div>

            {profile.isArtist && (
              <span style={{
                display: 'inline-block', marginBottom: '16px',
                fontFamily: font, fontSize: '0.55rem', fontWeight: 700,
                letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 10px',
                borderRadius: '50px', background: 'rgba(232,197,71,0.12)',
                border: '1px solid var(--gold-border)', color: 'var(--gold)',
              }}>Margo Artist</span>
            )}

            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <span style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text-2)' }}>
                <strong style={{ color: 'var(--text)' }}>{followerCount ?? '—'}</strong> followers
              </span>
              <span style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text-2)' }}>
                <strong style={{ color: 'var(--text)' }}>{followingCount ?? '—'}</strong> following
              </span>
            </div>

            <div style={{ marginBottom: '24px' }}>
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
              borderRadius: '20px', padding: '24px', textAlign: 'left', marginBottom: '28px',
            }}>
              <p style={sectionLabelStyle}>Signature Lyric</p>
              {profile.signatureLyric ? (
                <>
                  <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--gold)', lineHeight: 1.5, marginBottom: '8px' }}>
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

            <div style={{ marginBottom: '28px' }}>
              <p style={sectionLabelStyle}>{isOwnProfile ? 'Your Lyrics' : 'Lyrics'}</p>
              {!canViewContent ? (
                <div style={{
                  border: '1px solid var(--border)', borderRadius: '16px', padding: '24px',
                  textAlign: 'center',
                }}>
                  <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-3)', fontStyle: 'italic', marginBottom: '4px' }}>
                    This account is private.
                  </p>
                  <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-3)' }}>
                    Follow {profile.displayName} to see their lyrics.
                  </p>
                </div>
              ) : ownPosts.length === 0 ? (
                isOwnProfile ? (
                  <Link href="/compose" style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-3)', fontStyle: 'italic', textDecoration: 'none' }}>
                    Share your first lyric →
                  </Link>
                ) : (
                  <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
                    Hasn&rsquo;t shared a lyric yet.
                  </p>
                )
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {ownPosts.map(post => (
                    <div key={post.id} style={{
                      border: '1px solid var(--border)', borderRadius: '16px', padding: '18px',
                    }}>
                      <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '1rem', color: 'var(--text)', lineHeight: 1.5, marginBottom: '8px' }}>
                        &ldquo;{post.text}&rdquo;
                      </p>
                      {(post.knowledge?.song || post.knowledge?.artist) && (
                        <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                          {post.knowledge?.song}{post.knowledge?.song && post.knowledge?.artist ? ' · ' : ''}{post.knowledge?.artist}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isOwnProfile && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '8px 20px',
                borderTop: '1px solid var(--border)', paddingTop: '20px', marginBottom: '24px',
              }}>
                <Link href="/settings" style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-3)', textDecoration: 'none' }}>
                  Account settings
                </Link>
                {showApplyCTA && (
                  <Link href="/apply-artist" style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-3)', textDecoration: 'none' }}>
                    {applyLabel}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-3)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}