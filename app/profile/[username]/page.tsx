'use client'
import { useEffect, useMemo, useState, useRef, type ChangeEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, signOutBrowser } from '@/lib/supabase/client'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useIdentity } from '@/hooks/useIdentity'
import { useArtistApplication } from '@/hooks/useArtistApplication'
import { usePosts } from '@/hooks/usePosts'
import { useOwnPrivatePosts } from '@/hooks/useOwnPrivatePosts'
import { useProfileReplays } from '@/hooks/useProfileReplays'
import { useAuthorLyricBacks } from '@/hooks/useAuthorLyricBacks'
import { ArtistBadge } from '@/components/artist-badge'
import { SongCatalogCard, type SongCardData } from '@/components/song-catalog-card'
import { SongPreviewSheet, type SongPreviewSeed } from '@/components/song-preview-sheet'
import { PostCard } from '@/components/post-card'
import { CardExportModal } from '@/components/card-export-modal'
import { resolveMargoMomentFromPost } from '@/lib/moment'
import { MoreIcon, EditIcon, ImagePlusIcon } from '@/components/icons'
import type { Post } from '@/hooks/usePosts'
import { usePrimaryTab } from '@/components/primary-tab-shell'
import { TYPE, UI_FONT, LYRIC_FONT } from '@/lib/fonts'
import { ProfileArtistLinks } from '@/components/profile-artist-links'
import { ProfileImageLightbox } from '@/components/profile-image-lightbox'
import { peekProfileCache, warmProfile, type WarmProfileRow } from '@/lib/profile-warm'
import { resolvePublicArtistCredit } from '@/lib/artist-identity'
import { uploadProfileCover } from '@/components/cover-upload'
import { PendingNavLink } from '@/components/pending-nav-link'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { playFull, playSnippet, togglePlayPause } from '@/lib/audio-engine'
import { matchLyricLine } from '@/lib/lyric-match'
import { useIsBuffering, useIsPlaying } from '@/hooks/useAudioEngine'

const supabase = createClient()

const font = UI_FONT
const lyricFont = LYRIC_FONT

// How many songs show in the profile's own preview row before someone
// needs to click through to the full discography page. Kept small and
// horizontally scrollable on purpose — this is a taste, not the whole
// catalog; the full list lives at /profile/[username]/songs.
const DISCOGRAPHY_PREVIEW_COUNT = 8

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: font, fontSize: TYPE.label, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '8px',
}

const emptyLyricStyle: React.CSSProperties = {
  fontFamily: lyricFont,
  fontStyle: 'italic',
  fontSize: TYPE.lyric,
  color: 'var(--text-secondary)',
  lineHeight: 1.5,
}

const profileStatStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '64px',
  minHeight: 'var(--margo-touch-min)',
  padding: '4px 12px',
  textDecoration: 'none',
  boxSizing: 'border-box',
  textAlign: 'center',
}

function ProfileStat({
  href,
  count,
  label,
  showDivider,
}: {
  href?: string
  count: number | string | null
  label: string
  showDivider?: boolean
}) {
  const display = typeof count === 'number' ? count.toLocaleString() : (count ?? '—')
  const style: React.CSSProperties = {
    ...profileStatStyle,
    borderRight: showDivider ? '1px solid var(--border)' : 'none',
  }
  const inner = (
    <>
      <span style={{
        fontFamily: font,
        fontSize: TYPE.secondary,
        fontWeight: 600,
        color: 'var(--text)',
        lineHeight: 1,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {display}
      </span>
      <span style={{
        fontFamily: font,
        fontSize: TYPE.label,
        fontWeight: 600,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        marginTop: '3px',
      }}>
        {label}
      </span>
    </>
  )
  if (href) {
    return (
      <PendingNavLink href={href} indicator="overlay" ringSize={22} style={style}>
        {inner}
      </PendingNavLink>
    )
  }
  return <span style={style}>{inner}</span>
}

function SignaturePlayButton({
  track,
}: {
  track: {
    id: string
    title: string
    artist: string
    artwork: string | null
    audioUrl: string
    lineIndex?: number
    lineText?: string
    startSec?: number
    endSec?: number
  }
}) {
  const playing = useIsPlaying(track.id)
  const buffering = useIsBuffering(track.id)
  const hasSnippet = (track.endSec ?? 0) > (track.startSec ?? 0)
  return (
    <button
      type="button"
      aria-label={playing ? 'Pause signature' : 'Play signature'}
      onClick={() => {
        if (playing) {
          togglePlayPause()
          return
        }
        if (hasSnippet) {
          void playSnippet({
            songId: track.id,
            audioUrl: track.audioUrl,
            title: track.title,
            artist: track.artist,
            artwork: track.artwork,
            lineIndex: track.lineIndex ?? 0,
            lineText: track.lineText || '',
            startSec: track.startSec ?? 0,
            endSec: track.endSec ?? 0,
            source: 'feed',
          })
          return
        }
        void playFull({
          songId: track.id,
          audioUrl: track.audioUrl,
          title: track.title,
          artist: track.artist,
          artwork: track.artwork,
          autoplay: true,
          source: 'feed-tier1',
        })
      }}
      style={{
        width: 'var(--margo-touch-min)',
        height: 'var(--margo-touch-min)',
        borderRadius: '50%',
        border: '1px solid var(--gold-border)',
        background: 'var(--gold-faint)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <PlayPauseIcon playing={playing} buffering={buffering} size={16} color="var(--gold)" />
    </button>
  )
}

type ProfileData = WarmProfileRow

interface ArtistSongRow {
  id: string
  title: string
  artist_display_name: string
  artwork_url: string | null
  status: string
  is_ai_generated: boolean
}

type FollowStatus = null | 'pending' | 'accepted'

type ProfileContentTab = 'lyrics' | 'replays' | 'backs' | 'private'

export default function ProfilePage({ username: usernameProp }: { username?: string } = {}) {
  const params = useParams<{ username: string }>()
  const router = useRouter()
  const { user, identity, syncCoverUrl } = useIdentity()
  const { application } = useArtistApplication()
  const { isTabActive } = usePrimaryTab()
  const username = (usernameProp || (typeof params.username === 'string' ? params.username : '')).trim()
  // Own profile is a keepalive "you" pane — pause posts Realtime while hidden.
  // Other profiles are full navigations (enabled stays true).
  const isOwnKeepaliveProfile =
    !!identity?.username && username.toLowerCase() === identity.username.toLowerCase()
  const postsLive = !isOwnKeepaliveProfile || isTabActive('you')
  const { posts } = usePosts({ enabled: postsLive })
  const cached = username ? peekProfileCache(username) : null
  const [profile, setProfile] = useState<ProfileData | null>(cached?.profile ?? null)
  const [loading, setLoading] = useState(!cached)
  const [notFound, setNotFound] = useState(false)
  const [privateInaccessible, setPrivateInaccessible] = useState(false)
  const [followerCount, setFollowerCount] = useState<number | null>(cached?.followerCount ?? null)
  const [followingCount, setFollowingCount] = useState<number | null>(cached?.followingCount ?? null)
  const [followStatus, setFollowStatus] = useState<FollowStatus>(null)
  const [followBusy, setFollowBusy] = useState(false)
  const [avatarLightboxOpen, setAvatarLightboxOpen] = useState(false)
  const [coverLightboxOpen, setCoverLightboxOpen] = useState(false)
  const [coverBusy, setCoverBusy] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [previewSong, setPreviewSong] = useState<SongPreviewSeed | null>(null)

  // ── Discography — public, live-only catalog for this profile, if
  // they're an artist. Only the total count + a small preview slice are
  // used on this page; the full browsable list lives at its own route
  // (/profile/[username]/songs) so this page never has to render every
  // song inline. ──────────────────────────────────────────────────────
  const [artistSongs, setArtistSongs] = useState<ArtistSongRow[]>([])
  const [artistSongsLoading, setArtistSongsLoading] = useState(false)
  const [artistStats, setArtistStats] = useState({ totalPlays: 0, totalResonates: 0 })
  const [signatureTrack, setSignatureTrack] = useState<{
    id: string
    title: string
    artist: string
    artwork: string | null
    audioUrl: string
    lineIndex?: number
    lineText?: string
    startSec?: number
    endSec?: number
  } | null>(null)

  useEffect(() => {
    if (!username) return
    let active = true
    const cachedNow = peekProfileCache(username)
    if (cachedNow) {
      setProfile(cachedNow.profile)
      setFollowerCount(cachedNow.followerCount)
      setFollowingCount(cachedNow.followingCount)
      setLoading(false)
      setNotFound(false)
      setPrivateInaccessible(false)
    } else {
      setProfile((prev) => (prev?.username === username ? prev : null))
    }

    void warmProfile(username).then(async (bundle) => {
      if (!active) return
      if (bundle) {
        setProfile(bundle.profile)
        setFollowerCount(bundle.followerCount)
        setFollowingCount(bundle.followingCount)
        setNotFound(false)
        setPrivateInaccessible(false)
        setLoading(false)
        return
      }

      const { data: visibility } = await supabase.rpc('profile_visibility_for_username', {
        p_username: username,
      })
      if (!active) return
      const row = visibility as { exists?: boolean; is_private?: boolean } | null
      if (row?.exists && row?.is_private) {
        setPrivateInaccessible(true)
        setProfile(null)
      } else {
        setNotFound(true)
        setProfile(null)
      }
      setLoading(false)
    })
    return () => { active = false }
  }, [username])

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
      .select('id, title, artist_display_name, artwork_url, status, is_ai_generated')
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

  useEffect(() => {
    const id = profile?.signatureSongId
    const lyric = profile?.signatureLyric
    if (!id) {
      setSignatureTrack(null)
      return
    }
    let active = true
    void supabase
      .from('songs')
      .select('id, title, artist_display_name, artwork_url, audio_url')
      .eq('id', id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!active) return
        if (!data?.audio_url) {
          setSignatureTrack(null)
          return
        }
        const match = lyric ? await matchLyricLine(supabase, data.id, lyric) : null
        if (!active) return
        setSignatureTrack({
          id: data.id,
          title: data.title,
          artist: data.artist_display_name,
          artwork: data.artwork_url,
          audioUrl: data.audio_url,
          lineIndex: match?.lineId,
          lineText: lyric || undefined,
          startSec: match?.startSec,
          endSec: match?.endSec,
        })
      })
    return () => { active = false }
  }, [profile?.signatureSongId, profile?.signatureLyric])

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

  const [contentTab, setContentTab] = useState<ProfileContentTab>('lyrics')
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)

  const { requireAuth, rehydrate } = useAuthGate()
  const [resonated, setResonated] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const saved = localStorage.getItem('margoResonated')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  const [resonateCounts, setResonateCounts] = useState<Record<string, number>>({})
  const [exportPost, setExportPost] = useState<Post | null>(null)

  const handleExport = (post: Post) => {
    if (!requireAuth()) return
    setExportPost(post)
  }

  const canViewContent = !profile?.isPrivate || isOwnProfile || followStatus === 'accepted'

  useEffect(() => {
    if (!accountMenuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [accountMenuOpen])

  const { items: profileReplays, loading: replaysLoading } = useProfileReplays(
    profile?.id ?? null,
    !!canViewContent && contentTab === 'replays'
  )
  const { posts: lyricBacks, loading: backsLoading } = useAuthorLyricBacks(
    profile?.id ?? null,
    !!canViewContent && contentTab === 'backs'
  )

  const allTabPosts = useMemo(() => {
    const replayPosts = profileReplays.map(r => r.post)
    return [...ownPosts, ...privatePosts, ...replayPosts, ...lyricBacks]
  }, [ownPosts, privatePosts, profileReplays, lyricBacks])

  const toggleResonate = async (postId: string) => {
    if (!requireAuth()) return
    if (!user?.id) return
    const already = resonated.has(postId)
    const myId = user.id
    setResonated(prev => {
      const next = new Set(prev)
      already ? next.delete(postId) : next.add(postId)
      try { localStorage.setItem('margoResonated', JSON.stringify([...next])) } catch {}
      return next
    })
    setResonateCounts(prev => {
      const fromPost = allTabPosts.find(x => x.id === postId)?.resonates ?? 0
      const current = prev[postId] ?? fromPost
      return { ...prev, [postId]: Math.max(0, current + (already ? -1 : 1)) }
    })
    try {
      if (already) {
        const { error } = await supabase.from('post_resonates').delete().eq('post_id', postId).eq('actor_id', myId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('post_resonates').insert({ post_id: postId, actor_id: myId })
        if (error) throw error
      }
    } catch {
      setResonated(prev => {
        const next = new Set(prev)
        already ? next.add(postId) : next.delete(postId)
        try { localStorage.setItem('margoResonated', JSON.stringify([...next])) } catch {}
        return next
      })
      setResonateCounts(prev => ({
        ...prev,
        [postId]: Math.max(0, (prev[postId] || 0) + (already ? 1 : -1)),
      }))
    }
  }

  const applicationStatus = application?.status ?? 'none'
  const showApplyCTA = isOwnProfile && !identity?.isArtist
  const applyLabel =
    applicationStatus === 'pending' ? 'Application pending' :
    applicationStatus === 'rejected' ? 'Reapply as artist' :
    'Apply as an artist'

  const handleSignOut = async () => {
    await signOutBrowser()
    await rehydrate()
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

  const coverUrl = profile?.coverUrl ?? null
  const hasCover = !!coverUrl

  async function handleCoverFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user || !profile) return
    setCoverBusy(true)
    try {
      const url = await uploadProfileCover(user.id, file)
      setProfile({ ...profile, coverUrl: url })
      syncCoverUrl(url)
    } catch (err) {
      console.error('Cover upload failed:', err)
    } finally {
      setCoverBusy(false)
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <style>{`
        .discog-row { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x proximity; padding-bottom: 4px; }
        .discog-row::-webkit-scrollbar { display: none; }
      `}</style>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: 'calc(var(--nav-height, 72px) + 88px) 0' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)', opacity: 0.5 }} />
          ))}
        </div>
      )}

      {!loading && notFound && (
        <p style={{ ...emptyLyricStyle, textAlign: 'center', paddingTop: 'calc(var(--nav-height, 72px) + 88px)' }}>
          No one here by that name.
        </p>
      )}

      {!loading && privateInaccessible && (
        <div style={{
          maxWidth: '360px', margin: '0 auto', paddingTop: 'calc(var(--nav-height, 72px) + 68px)', paddingLeft: '24px', paddingRight: '24px',
          textAlign: 'center',
        }}>
          <div style={{
            border: '1px solid var(--border)', borderRadius: '16px', padding: '24px',
          }}>
            <p style={{ ...emptyLyricStyle, marginBottom: '4px' }}>
              This account is private.
            </p>
            <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)', margin: 0 }}>
              Only people they accept can see their profile.
            </p>
          </div>
        </div>
      )}

      {!loading && profile && (
        <div>
          {hasCover ? (
            <div style={{
              position: 'relative',
              width: '100%',
              height: '148px',
              marginTop: 'var(--nav-height, 72px)',
              background: 'var(--surface-2)',
              overflow: 'hidden',
            }}>
              <button
                type="button"
                onClick={() => setCoverLightboxOpen(true)}
                aria-label={`View ${profile.displayName}'s cover photo`}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <img
                  src={coverUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </button>
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverBusy}
                  aria-label="Change cover photo"
                  style={{
                    position: 'absolute',
                    right: '12px',
                    bottom: '12px',
                    width: 'var(--margo-touch-min)',
                    height: 'var(--margo-touch-min)',
                    borderRadius: '50%',
                    background: 'var(--margo-bar)',
                    border: '1px solid var(--border-hi)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: coverBusy ? 'not-allowed' : 'pointer',
                    padding: 0,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <EditIcon size={16} color="var(--text-secondary)" />
                </button>
              )}
            </div>
          ) : isOwnProfile ? (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={coverBusy}
              aria-label="Add cover photo"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                minHeight: '100px',
                marginTop: 'var(--nav-height, 72px)',
                padding: 0,
                border: 'none',
                borderBottom: '1px dashed var(--gold-border)',
                background: 'var(--surface)',
                cursor: coverBusy ? 'not-allowed' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <ImagePlusIcon size={28} color="var(--gold)" />
            </button>
          ) : (
            <div style={{ height: 'var(--nav-height, 72px)' }} />
          )}

          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverFile}
            style={{ display: 'none' }}
          />

          <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 24px var(--margo-page-padding-bottom)' }}>
            <div style={{ marginTop: hasCover || isOwnProfile ? '-44px' : '20px', marginBottom: '20px' }}>
              {profile.avatarUrl ? (
                <button
                  type="button"
                  onClick={() => setAvatarLightboxOpen(true)}
                  aria-label={`View ${profile.displayName}'s photo`}
                  style={{
                    width: '88px', height: '88px', borderRadius: '50%', padding: 0,
                    background: 'none', border: '4px solid var(--bg)', boxSizing: 'border-box',
                    overflow: 'hidden', cursor: 'pointer', display: 'block',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <img src={profile.avatarUrl} alt={profile.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ) : (
                <div style={{
                  width: '88px', height: '88px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--gold), var(--gold-2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  border: '4px solid var(--bg)', boxSizing: 'border-box',
                }}>
                  <span style={{ fontFamily: font, fontSize: TYPE.displayName, fontWeight: 600, color: 'var(--bg)' }}>
                    {(profile.displayName || '??').slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h1 style={{ fontFamily: font, fontSize: TYPE.displayName, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                    {profile.displayName}
                  </h1>
                  {profile.isPrivate && (
                    <span style={{
                      fontFamily: font, fontSize: TYPE.label, fontWeight: 700,
                      letterSpacing: '0.16em', textTransform: 'uppercase', padding: '3px 8px',
                      borderRadius: '50px', background: 'var(--surface-2)',
                      border: '1px solid var(--border)', color: 'var(--text-muted)',
                    }}>Private</span>
                  )}
                </div>
                <p style={{ fontFamily: font, fontSize: TYPE.meta, color: 'var(--text-secondary)', margin: 0 }}>
                  @{profile.username}
                </p>
              </div>

              {isOwnProfile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'nowrap' }}>
                  <Link
                    href="/profile/edit"
                    style={{
                      minHeight: 'var(--margo-touch-min)', padding: '0 18px',
                      display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
                      background: 'var(--surface-2)', color: 'var(--text-secondary)',
                      border: '1px solid var(--border)', borderRadius: '50px',
                      fontFamily: font, fontWeight: 600, fontSize: TYPE.label,
                      letterSpacing: '1.5px', textTransform: 'uppercase',
                      textDecoration: 'none', cursor: 'pointer',
                      whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >Edit Profile</Link>
                  <div ref={accountMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                      type="button"
                      aria-label="Account menu"
                      aria-expanded={accountMenuOpen}
                      onClick={() => setAccountMenuOpen(o => !o)}
                      style={{
                        width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)',
                        minWidth: 'var(--margo-touch-min)', minHeight: 'var(--margo-touch-min)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: accountMenuOpen ? 'var(--surface-2)' : 'transparent',
                        border: '1px solid var(--border)', borderRadius: '50%',
                        cursor: 'pointer', padding: 0, boxSizing: 'border-box',
                        WebkitTapHighlightColor: 'transparent', flexShrink: 0,
                      }}
                    >
                      <MoreIcon size={18} color="var(--text-secondary)" />
                    </button>
                    {accountMenuOpen && (
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                        minWidth: '200px', background: 'var(--bg)',
                        border: '1px solid var(--border)', borderRadius: '10px',
                        boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
                        padding: '6px', zIndex: 40,
                      }}>
                        <Link
                          href="/settings"
                          onClick={() => setAccountMenuOpen(false)}
                          style={{
                            display: 'flex', alignItems: 'center',
                            minHeight: 'var(--margo-touch-min)',
                            fontFamily: font, fontSize: TYPE.secondary,
                            textDecoration: 'none', color: 'var(--text-secondary)',
                            padding: '0 12px', borderRadius: '6px', boxSizing: 'border-box',
                          }}
                        >Account Settings</Link>
                        {identity?.isArtist && (
                          <Link
                            href="/studio"
                            onClick={() => setAccountMenuOpen(false)}
                            style={{
                              display: 'flex', alignItems: 'center',
                              minHeight: 'var(--margo-touch-min)',
                              fontFamily: font, fontSize: TYPE.secondary,
                              textDecoration: 'none', color: 'var(--text-secondary)',
                              padding: '0 12px', borderRadius: '6px', boxSizing: 'border-box',
                            }}
                          >Studio</Link>
                        )}
                        {showApplyCTA && (
                          <Link
                            href="/apply-artist"
                            onClick={() => setAccountMenuOpen(false)}
                            style={{
                              display: 'flex', alignItems: 'center',
                              minHeight: 'var(--margo-touch-min)',
                              fontFamily: font, fontSize: TYPE.secondary,
                              textDecoration: 'none', color: 'var(--text-secondary)',
                              padding: '0 12px', borderRadius: '6px', boxSizing: 'border-box',
                            }}
                          >{applyLabel}</Link>
                        )}
                        <div style={{ height: '1px', background: 'var(--border)', margin: '6px 4px' }} />
                        <button
                          type="button"
                          onClick={() => { setAccountMenuOpen(false); void handleSignOut() }}
                          style={{
                            display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left',
                            minHeight: 'var(--margo-touch-min)',
                            fontFamily: font, fontSize: TYPE.secondary,
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '0 12px', borderRadius: '6px', boxSizing: 'border-box',
                          }}
                        >Sign Out</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!isOwnProfile && user && (
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <Link
                    href={`/messages/${profile.username}`}
                    style={{
                      minHeight: 'var(--margo-touch-min)', padding: '0 22px',
                      display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
                      background: 'transparent', color: 'var(--text-secondary)',
                      border: '1px solid var(--border)', borderRadius: '50px',
                      fontFamily: font, fontWeight: 700, fontSize: TYPE.label,
                      letterSpacing: '1.2px', textTransform: 'uppercase',
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
                      color: followStatus ? 'var(--text-secondary)' : 'var(--bg)',
                      border: followStatus ? '1px solid var(--border)' : 'none',
                      borderRadius: '50px', fontFamily: font, fontWeight: 700, fontSize: TYPE.label,
                      letterSpacing: '1.2px', textTransform: 'uppercase',
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
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'stretch',
              marginBottom: '16px',
            }}>
              <ProfileStat
                href={(isOwnProfile || !profile.followListsPrivate) ? `/profile/${profile.username}/followers` : undefined}
                count={followerCount}
                label="followers"
                showDivider
              />
              <ProfileStat
                href={(isOwnProfile || !profile.followListsPrivate) ? `/profile/${profile.username}/following` : undefined}
                count={followingCount}
                label="following"
                showDivider={!!profile.isArtist}
              />
              {profile.isArtist && (
                <ProfileStat
                  href={`/profile/${profile.username}/songs`}
                  count={artistSongsLoading ? '—' : artistSongs.length}
                  label="songs"
                />
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <p style={sectionLabelStyle}>Bio</p>
              {profile.bio ? (
                <p style={{ fontFamily: font, fontSize: TYPE.body, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {profile.bio}
                </p>
              ) : isOwnProfile ? (
                <Link href="/profile/edit" style={{ ...emptyLyricStyle, textDecoration: 'none' }}>
                  Add a bio
                </Link>
              ) : (
                <p style={emptyLyricStyle}>
                  No bio yet.
                </p>
              )}
            </div>

            {profile.isArtist && (
              <ProfileArtistLinks links={profile.artistLinks} />
            )}

            <div style={{
              background: 'var(--gold-faint)', border: '1px solid var(--gold-border)',
              borderRadius: '20px', padding: '24px', textAlign: 'left', marginBottom: '28px',
            }}>
              <p style={sectionLabelStyle}>Signature lyric</p>
              {profile.signatureLyric ? (
                <>
                  <p style={{ fontFamily: lyricFont, fontStyle: 'italic', fontSize: TYPE.lyric, color: 'var(--gold)', lineHeight: 1.5, marginBottom: '8px' }}>
                    &ldquo;{profile.signatureLyric}&rdquo;
                  </p>
                  {(profile.signatureSong || profile.signatureArtist || signatureTrack) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {signatureTrack ? <SignaturePlayButton track={signatureTrack} /> : null}
                      <p style={{
                        fontFamily: font,
                        fontSize: TYPE.meta,
                        color: 'var(--text-secondary)',
                        margin: 0,
                      }}>
                        {profile.signatureSong}{profile.signatureSong && profile.signatureArtist ? ' · ' : ''}{profile.signatureArtist}
                      </p>
                    </div>
                  )}
                </>
              ) : isOwnProfile ? (
                <Link href="/profile/edit" style={{ ...emptyLyricStyle, textDecoration: 'none' }}>
                  Add the lyric that says it best
                </Link>
              ) : (
                <p style={emptyLyricStyle}>
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
                      <p style={{ fontFamily: font, fontSize: TYPE.label, color: 'var(--text-muted)', margin: 0 }}>
                        {artistStats.totalPlays.toLocaleString()} plays · {artistStats.totalResonates.toLocaleString()} resonates
                      </p>
                    )}
                  </div>
                  {artistSongs.length > 0 && (
                    <Link
                      href={`/profile/${profile.username}/songs`}
                      style={{
                        fontFamily: font, fontSize: TYPE.label, fontWeight: 700,
                        letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold)',
                        textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap',
                      }}
                    >View all</Link>
                  )}
                </div>

                {artistSongsLoading ? (
                  <div className="discog-row">
                    {Array(4).fill(null).map((_, i) => (
                      <div key={i} style={{ flexShrink: 0, width: '130px', aspectRatio: '1', borderRadius: '12px', background: 'var(--surface-2)', border: '1px solid var(--border)' }} />
                    ))}
                  </div>
                ) : artistSongs.length === 0 ? (
                  <p style={emptyLyricStyle}>
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
                        artist: resolvePublicArtistCredit({
                          artistDisplayName: song.artist_display_name,
                          ownerDisplayName: profile.displayName,
                          ownerUsername: profile.username,
                        }),
                        artwork: song.artwork_url,
                        status: song.status,
                        isAiGenerated: song.is_ai_generated ?? false,
                      }
                      return (
                        <div key={song.id} style={{ flexShrink: 0, width: '130px', scrollSnapAlign: 'start' }}>
                          <SongCatalogCard song={cardData} onSelect={setPreviewSong} />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: '28px' }}>
              <div
                role="tablist"
                aria-label="Profile content"
                style={{
                  display: 'flex', gap: '4px', marginBottom: '16px',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {([
                  { id: 'lyrics' as const, label: isOwnProfile ? 'Your Lyrics' : 'Lyrics' },
                  { id: 'replays' as const, label: 'Replays' },
                  { id: 'backs' as const, label: 'Lyric Backs' },
                  ...(isOwnProfile ? [{ id: 'private' as const, label: 'Private' }] : []),
                ]).map(tab => {
                  const active = contentTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setContentTab(tab.id)}
                      style={{
                        flex: 1, minHeight: 'var(--margo-touch-min)',
                        fontFamily: font, fontSize: TYPE.label, fontWeight: 700,
                        letterSpacing: '0.16em', textTransform: 'uppercase',
                        color: active ? 'var(--gold)' : 'var(--text-muted)',
                        background: 'transparent', border: 'none',
                        borderBottom: active ? '2px solid var(--gold)' : '2px solid transparent',
                        marginBottom: '-1px', cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent', padding: '8px 4px',
                      }}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              {!canViewContent ? (
                <div style={{
                  border: '1px solid var(--border)', borderRadius: '16px', padding: '24px',
                  textAlign: 'center',
                }}>
                  <p style={{ ...emptyLyricStyle, marginBottom: '4px' }}>
                    This account is private.
                  </p>
                  <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)' }}>
                    Follow {profile.displayName} to see their lyrics.
                  </p>
                </div>
              ) : contentTab === 'lyrics' ? (
                ownPosts.length === 0 ? (
                  isOwnProfile ? (
                    <Link href="/compose" style={{ ...emptyLyricStyle, textDecoration: 'none' }}>
                      Share your first lyric
                    </Link>
                  ) : (
                    <p style={emptyLyricStyle}>
                      Hasn&rsquo;t shared a lyric yet.
                    </p>
                  )
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {ownPosts.map(post => (
                      <PostCard
                        key={post.id}
                        variant="row"
                        post={post}
                        resonated={resonated.has(post.id)}
                        resonateCount={resonateCounts[post.id] ?? post.resonates ?? 0}
                        echoCount={post.replies ?? 0}
                        onResonate={toggleResonate}
                        onExport={handleExport}
                      />
                    ))}
                  </div>
                )
              ) : contentTab === 'replays' ? (
                replaysLoading ? (
                  <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-muted)' }}>
                    Loading replays…
                  </p>
                ) : profileReplays.length === 0 ? (
                  <p style={emptyLyricStyle}>
                    {isOwnProfile ? 'No replays yet — tap Replay on a lyric in the feed.' : 'No replays yet.'}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {profileReplays.map(item => (
                      <div key={item.id}>
                        {item.quoteText ? (
                          <p style={{
                            margin: '0 4px 2px', paddingTop: '10px',
                            fontFamily: font, fontSize: TYPE.secondary,
                            color: 'var(--text-secondary)', lineHeight: 1.4,
                          }}>
                            {item.quoteText}
                          </p>
                        ) : null}
                        <PostCard
                          variant="row"
                          post={item.post}
                          resonated={resonated.has(item.post.id)}
                          resonateCount={resonateCounts[item.post.id] ?? item.post.resonates ?? 0}
                          echoCount={item.post.replies ?? 0}
                          onResonate={toggleResonate}
                          onExport={handleExport}
                        />
                      </div>
                    ))}
                  </div>
                )
              ) : contentTab === 'private' ? (
                privatePosts.length === 0 ? (
                  <p style={emptyLyricStyle}>
                    Nothing private yet — use Keep Private when you compose.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {privatePosts.map(post => (
                      <PostCard
                        key={post.id}
                        variant="row"
                        post={post}
                        resonated={resonated.has(post.id)}
                        resonateCount={resonateCounts[post.id] ?? post.resonates ?? 0}
                        echoCount={post.replies ?? 0}
                        onResonate={toggleResonate}
                        onExport={handleExport}
                      />
                    ))}
                  </div>
                )
              ) : backsLoading ? (
                <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-muted)' }}>
                  Loading lyric backs…
                </p>
              ) : lyricBacks.length === 0 ? (
                <p style={emptyLyricStyle}>
                  {isOwnProfile ? 'No lyric backs yet.' : 'No lyric backs yet.'}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {lyricBacks.map(post => (
                    <PostCard
                      key={post.id}
                      variant="row"
                      post={post}
                      resonated={resonated.has(post.id)}
                      resonateCount={resonateCounts[post.id] ?? post.resonates ?? 0}
                      echoCount={post.replies ?? 0}
                      onResonate={toggleResonate}
                      onExport={handleExport}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <CardExportModal
        open={!!exportPost}
        onOpenChange={(o) => { if (!o) setExportPost(null) }}
        moment={exportPost ? resolveMargoMomentFromPost(exportPost) : null}
      />
      {profile?.avatarUrl ? (
        <ProfileImageLightbox
          open={avatarLightboxOpen}
          onClose={() => setAvatarLightboxOpen(false)}
          src={profile.avatarUrl}
          alt={profile.displayName || profile.username}
        />
      ) : null}
      {profile?.coverUrl ? (
        <ProfileImageLightbox
          open={coverLightboxOpen}
          onClose={() => setCoverLightboxOpen(false)}
          src={profile.coverUrl}
          alt={`${profile.displayName || profile.username} cover photo`}
        />
      ) : null}
      {previewSong ? (
        <SongPreviewSheet
          song={previewSong}
          onClose={() => setPreviewSong(null)}
          artistUsernameHint={profile?.username}
        />
      ) : null}
    </main>
  )
}