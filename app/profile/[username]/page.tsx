'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useIdentity } from '@/hooks/useIdentity'
import { useArtistApplication } from '@/hooks/useArtistApplication'
import { usePosts } from '@/hooks/usePosts'
import { useOwnPrivatePosts } from '@/hooks/useOwnPrivatePosts'
import { ArtistBadge, type ArtistStatus } from '@/components/artist-badge'
import { SongCatalogCard, type SongCardData } from '@/components/song-catalog-card'

const font = 'var(--font-lora), serif'

// How many songs show in the profile's own preview row before someone
// needs to click through to the full discography page. Kept small and
// horizontally scrollable on purpose — this is a taste, not the whole
// catalog; the full list lives at /profile/[username]/songs.
const DISCOGRAPHY_PREVIEW_COUNT = 8

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: font, fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px',
}

interface ProfileData {
  id: string
  username: string
  displayName: string
  isArtist: boolean
  artistStatus: ArtistStatus
  bio: string | null
  avatarUrl: string | null
  signatureLyric: string | null
  signatureSong: string | null
  signatureArtist: string | null
  isPrivate: boolean
}

interface ArtistSongRow {
  id: string
  title: string
  artist_display_name: string
  artwork_url: string | null
  status: string
}

type FollowStatus = null | 'pending' | 'accepted'

export default function ProfilePage() {
  const params = useParams<{ username: string }>()
  const router = useRouter()
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

  // ── Discography — public, live-only catalog for this profile, if
  // they're an artist. Only the total count + a small preview slice are
  // used on this page; the full browsable list lives at its own route
  // (/profile/[username]/songs) so this page never has to render every
  // song inline. ──────────────────────────────────────────────────────
  const [artistSongs, setArtistSongs] = useState<ArtistSongRow[]>([])
  const [artistSongsLoading, setArtistSongsLoading] = useState(false)
  const [artistStats, setArtistStats] = useState({ totalPlays: 0, totalResonates: 0 })

  useEffect(() => {
    let active = true
    setLoading(true)
    setNotFound(false)
    supabase
      .from('profiles')
      .select('id, username, display_name, is_artist, artist_status, bio, avatar_url, signature_lyric, signature_song, signature_artist, is_private')
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
          artistStatus: data.artist_status ?? null,
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

  useEffect(() => {
    if (!profile?.isArtist) {
      setArtistSongs([])
      setArtistStats({ totalPlays: 0, totalResonates: 0 })
      return
    }
    let active = true
    setArtistSongsLoading(true)
    supabase
      .from('songs')
      .select('id, title, artist_display_name, artwork_url, status')
      .eq('owner_profile_id', profile.id)
      .eq('status', 'live')
      .order('created_at', { ascending: false })
      .then(async ({ data, error }) => {
        if (!active) return
        if (error) {
          console.error('Failed to load artist discography:', error)
          setArtistSongsLoading(false)
          return
        }
        const list = (data || []) as ArtistSongRow[]
        setArtistSongs(list)

        if (list.length > 0) {
          const { data: statRows, error: statErr } = await supabase
            .from('song_stats')
            .select('plays, resonate_count')
            .in('song_id', list.map(s => s.id))
          if (!active) return
          if (statErr) {
            console.error('Failed to load discography stats:', statErr)
          } else {
            const totals = (statRows || []).reduce(
              (acc, s) => ({
                totalPlays: acc.totalPlays + (s.plays || 0),
                totalResonates: acc.totalResonates + (s.resonate_count || 0),
              }),
              { totalPlays: 0, totalResonates: 0 }
            )
            setArtistStats(totals)
          }
        } else {
          setArtistStats({ totalPlays: 0, totalResonates: 0 })
        }
        setArtistSongsLoading(false)
      })
    return () => { active = false }
  }, [profile?.id, profile?.isArtist])

  const isOwnProfile = !!identity && !!profile && identity.username === profile.username

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

  // Private lyrics: only fetched when the viewer owns this profile. RLS
  // also blocks other users from selecting status=private rows.
  const { posts: privatePosts } = useOwnPrivatePosts(
    isOwnProfile && profile ? profile.id : null,
    isOwnProfile
  )

  const canViewContent = !profile?.isPrivate || isOwnProfile || followStatus === 'accepted'

  const applicationStatus = application?.status ?? 'none'
  const showApplyCTA = isOwnProfile && !identity?.isArtist
  const applyLabel =
    applicationStatus === 'pending' ? 'Application pending' :
    applicationStatus === 'rejected' ? 'Reapply as artist' :
    'Apply as an artist'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/feed')
  }

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
      <style>{`
        .discog-row { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x proximity; padding-bottom: 4px; }
        .discog-row::-webkit-scrollbar { display: none; }
      `}</style>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '160px 0' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)', opacity: 0.5 }} />
          ))}
        </div>
      )}

      {!loading && notFound && (
        <p style={{ fontFamily: font, fontStyle: 'italic', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '1rem', paddingTop: '160px' }}>
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
                      border: '1px solid var(--border)', color: 'var(--text-muted)',
                    }}>Private</span>
                  )}
                </div>
                <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
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

            <div style={{ marginBottom: '16px' }}>
              <ArtistBadge isArtist={profile.isArtist} artistStatus={profile.artistStatus} size={13} label />
            </div>

            {/* Stats row — Songs added as a third, clickable stat matching
                the same visual weight as followers/following, instead of
                the full catalog being dumped inline further down. Only
                shown for artists. */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: isOwnProfile ? '16px' : '20px' }}>
              <span style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text-2)' }}>
                <strong style={{ color: 'var(--text)' }}>{followerCount ?? '—'}</strong> followers
              </span>
              <span style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text-2)' }}>
                <strong style={{ color: 'var(--text)' }}>{followingCount ?? '—'}</strong> following
              </span>
              {profile.isArtist && (
                <Link
                  href={`/profile/${profile.username}/songs`}
                  style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text-2)', textDecoration: 'none' }}
                >
                  <strong style={{ color: 'var(--text)' }}>{artistSongsLoading ? '—' : artistSongs.length}</strong> songs
                </Link>
              )}
            </div>

            {isOwnProfile && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '6px 18px',
                paddingBottom: '20px', marginBottom: '20px',
                borderBottom: '1px solid var(--border)',
              }}>
                <Link href="/settings" style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                  Account settings
                </Link>
                {identity?.isArtist && (
                  <Link href="/studio" style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                    Studio
                  </Link>
                )}
                {showApplyCTA && (
                  <Link href="/apply-artist" style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                    {applyLabel}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  Sign out
                </button>
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <p style={sectionLabelStyle}>Bio</p>
              {profile.bio ? (
                <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                  {profile.bio}
                </p>
              ) : isOwnProfile ? (
                <Link href="/profile/edit" style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic', textDecoration: 'none' }}>
                  Add a bio →
                </Link>
              ) : (
                <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
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
                    <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      {profile.signatureSong}{profile.signatureSong && profile.signatureArtist ? ' · ' : ''}{profile.signatureArtist}
                    </p>
                  )}
                </>
              ) : isOwnProfile ? (
                <Link href="/profile/edit" style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic', textDecoration: 'none' }}>
                  Add the lyric that says it best →
                </Link>
              ) : (
                <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Hasn&rsquo;t picked one yet.
                </p>
              )}
            </div>

            {/* ── Discography preview — a taste, not the whole catalog.
                Capped at DISCOGRAPHY_PREVIEW_COUNT and horizontally
                scrollable (same row pattern Discover already uses for
                Songs/Moments), so this section takes up roughly one
                row's height regardless of how many songs an artist has.
                "View all" and the Songs stat above both go to the same
                full discography page. ── */}
            {profile.isArtist && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <p style={{ ...sectionLabelStyle, marginBottom: '2px' }}>Discography</p>
                    {artistSongs.length > 0 && (
                      <p style={{ fontFamily: font, fontSize: '0.62rem', color: 'var(--text-muted)', margin: 0 }}>
                        {artistStats.totalPlays.toLocaleString()} plays · {artistStats.totalResonates.toLocaleString()} resonates
                      </p>
                    )}
                  </div>
                  {artistSongs.length > 0 && (
                    <Link
                      href={`/profile/${profile.username}/songs`}
                      style={{
                        fontFamily: font, fontSize: '0.56rem', fontWeight: 700,
                        letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)',
                        textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap',
                      }}
                    >View all →</Link>
                  )}
                </div>

                {artistSongsLoading ? (
                  <div className="discog-row">
                    {Array(4).fill(null).map((_, i) => (
                      <div key={i} style={{ flexShrink: 0, width: '130px', aspectRatio: '1', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />
                    ))}
                  </div>
                ) : artistSongs.length === 0 ? (
                  <p style={{ fontFamily: font, fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                    {isOwnProfile ? (
                      <>Nothing live yet — head to <Link href="/studio" style={{ color: 'var(--gold)' }}>Studio</Link> to publish your first song.</>
                    ) : (
                      `${profile.displayName} hasn't published a song yet.`
                    )}
                  </p>
                ) : (
                  <div className="discog-row">
                    {artistSongs.slice(0, DISCOGRAPHY_PREVIEW_COUNT).map(song => {
                      const cardData: SongCardData = {
                        id: song.id,
                        title: song.title,
                        artist: song.artist_display_name,
                        artwork: song.artwork_url,
                        status: song.status,
                      }
                      return (
                        <div key={song.id} style={{ flexShrink: 0, width: '130px', scrollSnapAlign: 'start' }}>
                          <SongCatalogCard song={cardData} />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: '28px' }}>
              <p style={sectionLabelStyle}>{isOwnProfile ? 'Your Lyrics' : 'Lyrics'}</p>
              {!canViewContent ? (
                <div style={{
                  border: '1px solid var(--border)', borderRadius: '16px', padding: '24px',
                  textAlign: 'center',
                }}>
                  <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '4px' }}>
                    This account is private.
                  </p>
                  <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Follow {profile.displayName} to see their lyrics.
                  </p>
                </div>
              ) : ownPosts.length === 0 ? (
                isOwnProfile ? (
                  privatePosts.length > 0 ? (
                    <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No public lyrics yet — your private ones are below.
                    </p>
                  ) : (
                    <Link href="/compose" style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic', textDecoration: 'none' }}>
                      Share your first lyric →
                    </Link>
                  )
                ) : (
                  <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
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
                        <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                          {post.knowledge?.song}{post.knowledge?.song && post.knowledge?.artist ? ' · ' : ''}{post.knowledge?.artist}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isOwnProfile && privatePosts.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <p style={sectionLabelStyle}>Private</p>
                <p style={{ fontFamily: font, fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.45 }}>
                  Only you can see these — they stay off the Feed.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {privatePosts.map(post => (
                    <div key={post.id} style={{
                      border: '1px solid var(--gold-border)', borderRadius: '16px', padding: '18px',
                      background: 'var(--gold-faint)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                        <span style={{
                          fontFamily: font, fontSize: '0.6rem', fontWeight: 700,
                          color: 'var(--gold)', letterSpacing: '1.5px', textTransform: 'uppercase',
                        }}>Private</span>
                      </div>
                      <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '1rem', color: 'var(--text)', lineHeight: 1.5, marginBottom: '8px' }}>
                        &ldquo;{post.text}&rdquo;
                      </p>
                      {(post.knowledge?.song || post.knowledge?.artist) && (
                        <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                          {post.knowledge?.song}{post.knowledge?.song && post.knowledge?.artist ? ' · ' : ''}{post.knowledge?.artist}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}