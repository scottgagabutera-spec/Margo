'use client'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, signOutBrowser } from '@/lib/supabase/client'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useIdentity } from '@/hooks/useIdentity'
import { useUnreadMessagesCount } from '@/hooks/useUnreadMessagesCount'
import { useMessaging } from '@/hooks/useMessaging'
import { usePosts } from '@/hooks/usePosts'
import { useOwnPrivatePosts } from '@/hooks/useOwnPrivatePosts'
import { useProfileReplays } from '@/hooks/useProfileReplays'
import { useAuthorLyricBacks } from '@/hooks/useAuthorLyricBacks'
import { SongCatalogCard, type SongCardData } from '@/components/song-catalog-card'
import { SongPreviewSheet, type SongPreviewSeed } from '@/components/song-preview-sheet'
import { PostCard } from '@/components/post-card'
import { CardExportModal } from '@/components/card-export-modal'
import { resolveMargoMomentFromPost } from '@/lib/moment'
import type { Post } from '@/hooks/usePosts'
import { getPrimaryTabPaneEl, usePrimaryTab, usePrimaryTabLinkProps } from '@/components/primary-tab-shell'
import { TYPE, UI_FONT, LYRIC_FONT } from '@/lib/fonts'
import { ProfileArtistLinks } from '@/components/profile-artist-links'
import { ProfileImageLightbox } from '@/components/profile-image-lightbox'
import {
  fetchProfilePeek,
  patchProfileSurface,
  peekProfileCache,
  profileHasRenderableCache,
  warmProfile,
  type WarmProfileRow,
} from '@/lib/profile-warm'
import { PROFILE_SURFACE_READY } from '@/lib/profile/surface-ready'
import { resolveMessageEligibility, type FollowStatus } from '@/lib/message-eligibility'
import { readViewerFollowCache, writeViewerFollowCache } from '@/lib/viewer-follow-cache'
import { FeedPostSkeletonList, ProfilePageSkeleton, ProfileSocialActionsSkeleton } from '@/components/margo-skeletons'
import { MargoPaneErrorBoundary } from '@/components/margo-pane-error-boundary'
import { resolvePublicArtistCredit } from '@/lib/artist-identity'
import { PendingNavLink } from '@/components/pending-nav-link'
import { MargoCtaButton } from '@/components/margo-cta-button'
import { PenLineIcon, PlusIcon } from '@/components/icons'
import { MargoActionSheet } from '@/components/margo-action-sheet'
import { MargoLongPressHint } from '@/components/margo-long-press-hint'
import { resolveSignatureMomentSnippet } from '@/lib/signature-snippet'
import { useLongPress } from '@/hooks/useLongPress'
import { ProfileIdentityBlock } from '@/components/profile-portrait-identity'
import {
  ProfileHeroCluster,
  ProfileHeroOwnerActions,
  ProfileHeroVisitorActions,
} from '@/components/profile-hero-cluster'
import { ProfileShellHeader } from '@/components/profile-shell-header'
import { ProfileBioClamp } from '@/components/profile-bio-clamp'
import { shareProfile } from '@/lib/profile-share'
import {
  ProfileSignatureLyricSheet,
  ProfileSignaturePill,
} from '@/components/profile-signature-pill'
import {
  ProfileFavoriteArtistsRow,
  type ProfileFavoriteArtist,
} from '@/components/profile-favorite-artists-row'
import { ProfileMemoriesStrip } from '@/components/profile-memories-strip'
import { MemoryCard } from '@/components/memory-card'
import { useProfileMemories } from '@/hooks/useProfileMemories'
import { memoryTimelineYear } from '@/lib/memory/date-label'
import { useMargoPageResume } from '@/hooks/useMargoPageResume'
import { profileResumeKey } from '@/lib/margo-page-resume'

const supabase = createClient()

const font = UI_FONT
const lyricFont = LYRIC_FONT

// How many songs show in the profile's own preview row before someone
// needs to click through to the full discography page. Kept small and
// horizontally scrollable on purpose — this is a taste, not the whole
// catalog; the full list lives at /profile/[username]/songs.
const DISCOGRAPHY_PREVIEW_COUNT = 8

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: font,
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: 'var(--text-muted)',
  letterSpacing: '-0.01em',
  marginBottom: '8px',
}

const emptyLyricStyle: React.CSSProperties = {
  fontFamily: lyricFont,
  fontStyle: 'normal',
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
      <span className="margo-profile-stat__value">{display}</span>
      <span className="margo-profile-stat__label">{label}</span>
    </>
  )
  if (href) {
    return (
      <PendingNavLink href={href} indicator="overlay" ringSize={22} style={style} className="margo-profile-stat">
        {inner}
      </PendingNavLink>
    )
  }
  return (
    <span style={style} className="margo-profile-stat">
      {inner}
    </span>
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

type ProfileContentTab = 'lyrics' | 'memories' | 'reposts' | 'backs' | 'private'

function parseProfileContentTab(raw: string | undefined | null): ProfileContentTab | null {
  if (
    raw === 'lyrics' ||
    raw === 'memories' ||
    raw === 'reposts' ||
    raw === 'backs' ||
    raw === 'private'
  ) {
    return raw
  }
  return null
}

type FollowRelationState = {
  ready: boolean
  status: FollowStatus
}

export default function ProfilePage(props: { username?: string } = {}) {
  return (
    <MargoPaneErrorBoundary surface="profile-pane">
      <ProfilePageInner {...props} />
    </MargoPaneErrorBoundary>
  )
}

function ProfilePageInner({ username: usernameProp }: { username?: string } = {}) {
  const params = useParams<{ username: string }>()
  const router = useRouter()
  const { user, identity, updateSignatureLyric } = useIdentity()
  const { isTabActive } = usePrimaryTab()
  const composeTabLink = usePrimaryTabLinkProps('/compose', 'compose')
  const username = (usernameProp || (typeof params.username === 'string' ? params.username : '')).trim()
  const profileResumeKeyId = username ? profileResumeKey(username) : ''
  // Own profile is a keepalive "you" pane — pause posts Realtime while hidden.
  // Other profiles are full navigations (enabled stays true).
  const isOwnKeepaliveProfile =
    !!identity?.username && username.toLowerCase() === identity.username.toLowerCase()
  const postsLive = !isOwnKeepaliveProfile || isTabActive('you')
  const { posts } = usePosts({ enabled: postsLive })
  const cached = username ? peekProfileCache(username) : null
  const [profile, setProfile] = useState<ProfileData | null>(cached?.profile ?? null)
  const [loading, setLoading] = useState(
    () => !(username && profileHasRenderableCache(username)),
  )
  const [notFound, setNotFound] = useState(false)
  const [followerCount, setFollowerCount] = useState<number | null>(cached?.followerCount ?? null)
  const [followingCount, setFollowingCount] = useState<number | null>(cached?.followingCount ?? null)
  const [postsCount, setPostsCount] = useState<number | null>(cached?.postsCount ?? null)
  const [followRelation, setFollowRelation] = useState<FollowRelationState>({ ready: true, status: null })
  const [followBusy, setFollowBusy] = useState(false)
  const [avatarLightboxOpen, setAvatarLightboxOpen] = useState(false)
  const [signatureReadOpen, setSignatureReadOpen] = useState(false)
  const [previewSong, setPreviewSong] = useState<SongPreviewSeed | null>(null)
  const [favoriteArtists, setFavoriteArtists] = useState<ProfileFavoriteArtist[]>(() => {
    const c = username ? peekProfileCache(username) : null
    if (c?.surfaceLoadedAt) return c.favoriteArtists ?? []
    return []
  })
  const [favoriteSongs, setFavoriteSongs] = useState(
    () => (username ? peekProfileCache(username)?.favoriteSongs : undefined) ?? [],
  )
  const [favoriteSongsReady, setFavoriteSongsReady] = useState(
    () => !!peekProfileCache(username || '')?.favoriteSongsReady,
  )
  const [favoriteAlbumsReady, setFavoriteAlbumsReady] = useState(
    () => !!peekProfileCache(username || '')?.favoriteAlbumsReady,
  )

  // ── Discography — public, live-only catalog for this profile, if
  // they're an artist. Only the total count + a small preview slice are
  // used on this page; the full browsable list lives at its own route
  // (/profile/[username]/songs) so this page never has to render every
  // song inline. ──────────────────────────────────────────────────────
  const [artistSongs, setArtistSongs] = useState<ArtistSongRow[]>([])
  const [artistSongsLoading, setArtistSongsLoading] = useState(false)
  const [artistStats, setArtistStats] = useState({ totalPlays: 0, totalResonates: 0 })
  const [signatureSheetOpen, setSignatureSheetOpen] = useState(false)
  const [signatureActionBusy, setSignatureActionBusy] = useState(false)
  const [signatureTrack, setSignatureTrack] = useState<{
    id: string
    title: string
    artist: string
    artwork: string | null
    audioUrl: string
    lineIndex: number
    lineText: string
    startSec: number
    endSec: number
  } | null>(null)
  useEffect(() => {
    if (!username) return
    let active = true
    const cachedNow = peekProfileCache(username)
    if (cachedNow) {
      setProfile(cachedNow.profile)
      setFollowerCount(cachedNow.followerCount)
      setFollowingCount(cachedNow.followingCount)
      setPostsCount(cachedNow.postsCount)
      if (cachedNow.favoriteArtists) setFavoriteArtists(cachedNow.favoriteArtists)
      if (cachedNow.favoriteSongs) setFavoriteSongs(cachedNow.favoriteSongs)
      setFavoriteSongsReady(!!cachedNow.favoriteSongsReady)
      setFavoriteAlbumsReady(!!cachedNow.favoriteAlbumsReady)
      setLoading(false)
      setNotFound(false)
    } else {
      setProfile((prev) => (prev?.username === username ? prev : null))
      setLoading(true)
    }

    void warmProfile(username).then(async (bundle) => {
      if (!active) return
      if (bundle) {
        setProfile(bundle.profile)
        setFollowerCount(bundle.followerCount)
        setFollowingCount(bundle.followingCount)
        setPostsCount(bundle.postsCount)
        if (bundle.favoriteArtists) setFavoriteArtists(bundle.favoriteArtists)
        if (bundle.favoriteSongs) setFavoriteSongs(bundle.favoriteSongs)
        setFavoriteSongsReady(!!bundle.favoriteSongsReady)
        setFavoriteAlbumsReady(!!bundle.favoriteAlbumsReady)
        setNotFound(false)
        setLoading(false)
        if (bundle.viewerFollowStatus !== undefined) {
          setFollowRelation({ ready: true, status: bundle.viewerFollowStatus ?? null })
        }
        return
      }

      const peek = await fetchProfilePeek(username)
      if (!active) return
      if (peek) {
        setProfile(peek.profile)
        setFollowerCount(peek.followerCount)
        setFollowingCount(peek.followingCount)
        setPostsCount(peek.postsCount)
        setNotFound(false)
        setLoading(false)
        if (peek.viewerFollowStatus !== undefined) {
          setFollowRelation({ ready: true, status: peek.viewerFollowStatus ?? null })
        }
        return
      }
      setNotFound(true)
      setProfile(null)
      setLoading(false)
    })
    return () => { active = false }
  }, [username])

  useEffect(() => {
    const onSurface = (e: Event) => {
      const detail = (e as CustomEvent<{ username?: string }>).detail
      if (detail?.username !== username.toLowerCase()) return
      const peek = peekProfileCache(username)
      const surface = peekProfileCache(username)
      if (surface?.favoriteArtists) setFavoriteArtists(surface.favoriteArtists)
      if (surface?.favoriteSongs) setFavoriteSongs(surface.favoriteSongs)
      setFavoriteSongsReady(!!surface?.favoriteSongsReady)
      setFavoriteAlbumsReady(!!surface?.favoriteAlbumsReady)
    }
    window.addEventListener(PROFILE_SURFACE_READY, onSurface)
    return () => window.removeEventListener(PROFILE_SURFACE_READY, onSurface)
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
        const snippet = await resolveSignatureMomentSnippet(supabase, data.id, lyric)
        if (!active) return
        if (!snippet) {
          setSignatureTrack(null)
          return
        }
        setSignatureTrack({
          id: data.id,
          title: data.title,
          artist: data.artist_display_name,
          artwork: data.artwork_url,
          audioUrl: data.audio_url,
          lineIndex: snippet.lineIndex,
          lineText: snippet.lineText || lyric || '',
          startSec: snippet.startSec,
          endSec: snippet.endSec,
        })
      })
    return () => { active = false }
  }, [profile?.signatureSongId, profile?.signatureLyric])

  const isOwnProfile = !!identity && !!profile && identity.username === profile.username

  const signatureLongPress = useLongPress({
    disabled: !isOwnProfile,
    onLongPress: () => setSignatureSheetOpen(true),
  })

  useEffect(() => {
    if (!user || !profile || isOwnProfile) {
      setFollowRelation({ ready: true, status: null })
      return
    }
    const cached = readViewerFollowCache(user.id, profile.id)
    setFollowRelation({
      ready: cached !== undefined,
      status: cached !== undefined ? cached : null,
    })

    let active = true
    supabase
      .from('follows')
      .select('status')
      .eq('follower_id', user.id)
      .eq('followee_id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        const status = data ? (data.status as FollowStatus) : null
        writeViewerFollowCache(user.id, profile.id, status)
        setFollowRelation({ ready: true, status })
      })
    return () => { active = false }
  }, [user?.id, profile?.id, isOwnProfile])

  useEffect(() => {
    if (!user?.id || !profile?.id || isOwnProfile) {
      setFollowsViewer(false)
      return
    }
    let active = true
    void supabase
      .from('follows')
      .select('status')
      .eq('follower_id', profile.id)
      .eq('followee_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        setFollowsViewer(data?.status === 'accepted')
      })
    return () => { active = false }
  }, [user?.id, profile?.id, isOwnProfile])

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
  const [memoryLayout, setMemoryLayout] = useState<'grid' | 'timeline'>('grid')

  useMargoPageResume({
    pageKey: profileResumeKeyId,
    enabled: !!profileResumeKeyId,
    scroller: isOwnKeepaliveProfile ? 'element' : 'window',
    getScroller: isOwnKeepaliveProfile
      ? () => getPrimaryTabPaneEl('you')
      : undefined,
    readExtra: () => ({ tab: contentTab }),
    onResume: (entry) => {
      const tab = parseProfileContentTab(entry.tab)
      if (tab) setContentTab(tab)
    },
  })
  const { memories: profileMemories, loading: profileMemoriesLoading } = useProfileMemories(
    profile?.id ?? null,
    profile?.username ?? null,
  )

  const handleFavoritesChange = useCallback(
    (next: ProfileFavoriteArtist[]) => {
      setFavoriteArtists(next)
      if (profile?.username) patchProfileSurface(profile.username, { favoriteArtists: next })
    },
    [profile?.username],
  )

  const handleFavoriteSongsChange = useCallback(
    (next: import('@/lib/profile/load-favorite-songs').ProfileFavoriteSong[]) => {
      setFavoriteSongs(next)
      if (profile?.username) patchProfileSurface(profile.username, { favoriteSongs: next })
    },
    [profile?.username],
  )
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [visitorMenuOpen, setVisitorMenuOpen] = useState(false)
  const accountMenuTriggerRef = useRef<HTMLButtonElement>(null)
  const [shareBusy, setShareBusy] = useState(false)
  const [followsViewer, setFollowsViewer] = useState(false)
  const inboxUnread = useUnreadMessagesCount()
  const { conversations } = useMessaging()
  const partnerUnread = useMemo(() => {
    if (!profile?.username) return 0
    return conversations.find((c) => c.otherUser.username === profile.username)?.unreadCount ?? 0
  }, [conversations, profile?.username])

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

  const followStatus = followRelation.status
  const followKnown = followRelation.ready || isOwnProfile || !user
  const socialActionsReady = followRelation.ready || isOwnProfile || !user

  const profileContentAccess = useMemo(() => {
    if (!profile?.isPrivate || isOwnProfile) return 'open' as const
    if (!followKnown) return 'loading' as const
    return followStatus === 'accepted' ? 'open' as const : 'blocked' as const
  }, [profile?.isPrivate, isOwnProfile, followKnown, followStatus])

  const canViewContent = profileContentAccess === 'open'

  const messageEligibility = useMemo(
    () => resolveMessageEligibility({
      whoCanMessage: profile?.whoCanMessage,
      followStatus,
      isOwnProfile,
      followKnown,
    }),
    [profile?.whoCanMessage, followStatus, isOwnProfile, followKnown],
  )

  const { items: profileReposts, loading: repostsLoading } = useProfileReplays(
    profile?.id ?? null,
    !!canViewContent && contentTab === 'reposts'
  )
  const { posts: lyricBacks, loading: backsLoading } = useAuthorLyricBacks(
    profile?.id ?? null,
    !!canViewContent && contentTab === 'backs'
  )

  const allTabPosts = useMemo(() => {
    const repostPosts = profileReposts.map(r => r.post)
    return [...ownPosts, ...privatePosts, ...repostPosts, ...lyricBacks]
  }, [ownPosts, privatePosts, profileReposts, lyricBacks])

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

  const handleSignOut = async () => {
    await signOutBrowser()
    await rehydrate()
    router.push('/feed')
  }

  const handleVisitorFollowClick = () => {
    if (!profile || followBusy) return
    if (!user) {
      requireAuth()
      return
    }
    void handleFollowClick()
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
          setFollowRelation({ ready: true, status: resultStatus })
          if (user) writeViewerFollowCache(user.id, profile.id, resultStatus)
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
          setFollowRelation({ ready: true, status: null })
          if (user) writeViewerFollowCache(user.id, profile.id, null)
        }
      }
    } finally {
      setFollowBusy(false)
    }
  }

  const followLabel =
    followStatus === 'accepted' ? 'Following' :
    followStatus === 'pending' ? 'Requested' :
    followsViewer ? 'Follow back' :
    'Follow'

  const handleShareProfile = async () => {
    if (!profile || shareBusy) return
    setShareBusy(true)
    try {
      await shareProfile({
        username: profile.username,
        displayName: profile.displayName || profile.username,
      })
    } finally {
      setShareBusy(false)
    }
  }

  const memoriesVisibleCount = profileMemories.length

  const renderStats = (p: WarmProfileRow) => (
    <div className="margo-profile-stats">
      {p.isArtist ? (
        <ProfileStat
          count={artistSongs.length}
          label="songs"
          showDivider
        />
      ) : (
        <ProfileStat
          count={postsCount ?? (isOwnProfile ? ownPosts.length : null)}
          label="lyrics"
          showDivider
        />
      )}
      {p.isArtist ? (
        <ProfileStat
          count={postsCount ?? (isOwnProfile ? ownPosts.length : null)}
          label="lyrics"
          showDivider
        />
      ) : (
        <ProfileStat
          count={memoriesVisibleCount}
          label="memories"
          showDivider
        />
      )}
      <ProfileStat
        href={(isOwnProfile || !p.followListsPrivate) ? `/profile/${p.username}/followers` : undefined}
        count={followerCount}
        label="followers"
        showDivider
      />
      <ProfileStat
        href={(isOwnProfile || !p.followListsPrivate) ? `/profile/${p.username}/following` : undefined}
        count={followingCount}
        label="following"
      />
    </div>
  )

  const ownerHeroActions =
    profile && isOwnProfile
      ? ProfileHeroOwnerActions({ messagesUnreadCount: inboxUnread })
      : null

  const visitorHeroActions =
    profile && !isOwnProfile
      ? ProfileHeroVisitorActions({
          signedOut: !user,
          profileId: profile.id,
          messageHref: messageEligibility.canOpenThread ? `/messages/${profile.username}` : undefined,
          messageDisabled: !messageEligibility.canOpenThread,
          messageTitle: messageEligibility.blockedReason || undefined,
          followLabel,
          followAccepted: followStatus === 'accepted',
          onFollow: handleVisitorFollowClick,
          followBusy,
          socialReady: socialActionsReady,
          messageUnreadCount: partnerUnread,
          signInReturnTo: `/profile/${profile.username}`,
        })
      : null

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <style>{`
        .discog-row { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x proximity; padding-bottom: 4px; }
        .discog-row::-webkit-scrollbar { display: none; }
      `}</style>

      {loading && !profile && <ProfilePageSkeleton />}

      {!loading && notFound ? (
        <p className="margo-sr-only">Founding Listener — profile not available.</p>
      ) : null}

      {profile && (
        <div className="margo-profile-page">
          <div className="margo-profile-shell">
            <div className="margo-profile-shell__left">
            <div className="margo-profile-block--header">
              <ProfileShellHeader
                isOwnProfile={isOwnProfile}
                showStudio={!!identity?.isArtist}
                accountMenuOpen={accountMenuOpen}
                onAccountMenuOpenChange={setAccountMenuOpen}
                accountMenuTriggerRef={accountMenuTriggerRef}
                onSignOut={() => { void handleSignOut() }}
                onVisitorMenuOpen={() => setVisitorMenuOpen(true)}
                showShare
                shareBusy={shareBusy}
                onShare={() => { void handleShareProfile() }}
              />
            </div>

            <div className="margo-profile-block--hero">
              {!isOwnProfile && user && !socialActionsReady ? (
                <ProfileSocialActionsSkeleton />
              ) : (
                <ProfileHeroCluster
                  portrait={{
                    displayName: profile.displayName || profile.username,
                    username: profile.username,
                    avatarUrl: profile.avatarUrl,
                    onAvatarClick: () => setAvatarLightboxOpen(true),
                  }}
                  leftFlank={ownerHeroActions?.left ?? visitorHeroActions?.left}
                  rightFlank={ownerHeroActions?.right ?? visitorHeroActions?.right}
                />
              )}
            </div>

            <div className="margo-profile-block--identity">
              <ProfileIdentityBlock
                displayName={profile.displayName || profile.username}
                username={profile.username}
                isPrivate={profile.isPrivate}
                isArtist={profile.isArtist}
                artistStatus={profile.artistStatus}
              />
            </div>

            {(profile.bio || isOwnProfile) ? (
              <div className="margo-profile-block--bio">
                <ProfileBioClamp
                  bio={profile.bio || ''}
                  editHref={isOwnProfile ? '/profile/edit' : undefined}
                />
              </div>
            ) : null}

            <div className="margo-profile-block--stats">
              {renderStats(profile)}
            </div>

            {profile.isArtist ? (
              <div className="margo-profile-block--artist-links">
                <ProfileArtistLinks links={profile.artistLinks} variant="profile" />
              </div>
            ) : null}

            <div className="margo-profile-block--signature">
            {profile.signatureLyric ? (
              <MargoLongPressHint
                active={isOwnProfile ? signatureLongPress.pressing : false}
                progress={signatureLongPress.progress}
                style={{ marginBottom: 0 }}
              >
                <ProfileSignaturePill
                  lyric={profile.signatureLyric}
                  songTitle={profile.signatureSong}
                  artistName={profile.signatureArtist}
                  track={signatureTrack}
                  isOwner={isOwnProfile}
                  longPressHandlers={isOwnProfile ? signatureLongPress.handlers : undefined}
                  onOpenLyric={() => {
                    if (isOwnProfile && signatureLongPress.consumeClick()) return
                    setSignatureReadOpen(true)
                  }}
                />
              </MargoLongPressHint>
            ) : isOwnProfile ? (
              <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                <Link
                  href="/profile/edit#signature"
                  style={{
                    fontFamily: font,
                    fontSize: TYPE.meta,
                    color: 'var(--text-muted)',
                    textDecoration: 'none',
                  }}
                >
                  Add signature lyric
                </Link>
              </div>
            ) : null}
            </div>

            {profile.isArtist ? (
              <div className="margo-profile-block--songs-preview margo-profile-songs-preview--mobile">
                <p className="margo-profile-ui-label margo-profile-songs-preview__label">Songs</p>
                {artistSongs.length === 0 && isOwnProfile ? (
                  <Link href="/studio" className="margo-profile-cta-dash margo-profile-cta-dash--wide">
                    Add your first song
                  </Link>
                ) : null}
                <div className="margo-profile-songs-preview__row discog-row">
                  {artistSongs.slice(0, 12).map((song) => {
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
                      isAiGenerated: song.is_ai_generated,
                    }
                    return (
                      <div key={song.id} className="margo-profile-songs-preview__tile">
                        <SongCatalogCard
                          song={cardData}
                          onSelect={() =>
                            setPreviewSong({
                              id: song.id,
                              title: song.title,
                              artist: song.artist_display_name,
                              artwork: song.artwork_url,
                            })
                          }
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {(isOwnProfile || profileMemories.length > 0 || profileMemoriesLoading) ? (
              <div className="margo-profile-block--memories margo-profile-memories--mobile">
                <ProfileMemoriesStrip
                  memories={profileMemories}
                  isOwnProfile={isOwnProfile}
                  loading={profileMemoriesLoading}
                />
              </div>
            ) : null}

            {isOwnProfile || favoriteArtists.length > 0 || favoriteSongs.length > 0 ? (
              <div className="margo-profile-block--favorites margo-profile-block--favorites--reserve">
                <ProfileFavoriteArtistsRow
                  favorites={favoriteArtists}
                  favoriteSongs={favoriteSongs}
                  songsReady={favoriteSongsReady}
                  albumsReady={favoriteAlbumsReady}
                  isOwnProfile={isOwnProfile}
                  showEmptyOwnerLink
                  onFavoritesChange={handleFavoritesChange}
                  onFavoriteSongsChange={handleFavoriteSongsChange}
                />
              </div>
            ) : null}
            </div>

            <div className="margo-profile-shell__right">
            {profile.isArtist ? (
              <div className="margo-profile-block--songs-preview margo-profile-songs-preview--desktop">
                <p className="margo-profile-ui-label margo-profile-songs-preview__label">Songs</p>
                {artistSongs.length === 0 && isOwnProfile ? (
                  <Link href="/studio" className="margo-profile-cta-dash margo-profile-cta-dash--wide">
                    Add your first song
                  </Link>
                ) : null}
                {artistSongs.length > 0 ? (
                  <div className="margo-profile-songs-preview__row discog-row margo-profile-songs-preview__row--desktop">
                    {artistSongs.slice(0, 12).map((song) => {
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
                        isAiGenerated: song.is_ai_generated,
                      }
                      return (
                        <div key={song.id} className="margo-profile-songs-preview__tile margo-profile-songs-preview__tile--desktop">
                          <SongCatalogCard
                            song={cardData}
                            onSelect={() =>
                              setPreviewSong({
                                id: song.id,
                                title: song.title,
                                artist: song.artist_display_name,
                                artwork: song.artwork_url,
                              })
                            }
                          />
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
            {(isOwnProfile || profileMemories.length > 0 || profileMemoriesLoading) ? (
              <div className="margo-profile-block--memories margo-profile-memories--desktop">
                <ProfileMemoriesStrip
                  memories={profileMemories}
                  isOwnProfile={isOwnProfile}
                  loading={profileMemoriesLoading}
                />
              </div>
            ) : null}
            {/* ── Discography preview — a taste, not the whole catalog.
                Capped at DISCOGRAPHY_PREVIEW_COUNT and horizontally
                scrollable (same row pattern Discover already uses for
                Songs/Moments), so this section takes up roughly one
                row's height regardless of how many songs an artist has.
                "View all" and the Songs stat above both go to the same
                full discography page. ── */}
            {profile.isArtist && (
              <div className="margo-profile-discography-preview margo-profile-block--discography" style={{ marginBottom: '28px' }}>
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
                      className="margo-section-header__action"
                      style={{
                        fontFamily: font,
                        textDecoration: 'none',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
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
                  isOwnProfile ? (
                    <MargoCtaButton href="/studio" variant="outline" icon={<PenLineIcon size={18} color="var(--gold)" />}>
                      Open Studio
                    </MargoCtaButton>
                  ) : null
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

            {profileContentAccess !== 'blocked' ? (
              <div className="margo-profile-tabs-sticky margo-profile-block--tabs">
                <div
                  role="tablist"
                  aria-label="Profile content"
                  className="margo-profile-content-tabs"
                >
                  {([
                    { id: 'lyrics' as const, label: 'Lyrics' },
                    { id: 'memories' as const, label: 'Memories' },
                    { id: 'reposts' as const, label: 'Reposts' },
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
                        className={`margo-profile-content-tab${active ? ' margo-profile-content-tab--active' : ''}`}
                      >
                        {tab.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div className="margo-profile-block--feed">
              {profileContentAccess === 'loading' ? (
                <FeedPostSkeletonList count={2} />
              ) : profileContentAccess === 'blocked' ? (
                <div style={{
                  border: '1px solid var(--border)', borderRadius: '16px', padding: '24px',
                  textAlign: 'center',
                }}>
                  <p style={{ ...emptyLyricStyle, marginBottom: '4px' }}>
                    This account is private.
                  </p>
                  <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)', margin: 0 }}>
                    Follow to view lyrics.
                  </p>
                </div>
              ) : (
              <>
              {contentTab === 'memories' ? (
                profileMemories.length === 0 ? (
                  isOwnProfile ? (
                    <MargoCtaButton href="/memories/new" icon={<PlusIcon size={16} color="var(--bg)" />}>
                      Create memory
                    </MargoCtaButton>
                  ) : null
                ) : (
                  <>
                    <div className="margo-profile-memories-tab__toggle">
                      <button
                        type="button"
                        className={memoryLayout === 'grid' ? 'margo-profile-memories-tab__btn--active' : 'margo-profile-memories-tab__btn'}
                        onClick={() => setMemoryLayout('grid')}
                      >
                        Grid
                      </button>
                      <button
                        type="button"
                        className={memoryLayout === 'timeline' ? 'margo-profile-memories-tab__btn--active' : 'margo-profile-memories-tab__btn'}
                        onClick={() => setMemoryLayout('timeline')}
                      >
                        Timeline
                      </button>
                    </div>
                    {memoryLayout === 'grid' ? (
                      <div className="margo-profile-memories-tab__grid">
                        {profileMemories.map((m) => (
                          <MemoryCard key={m.id} memory={m} variant="profileGrid" />
                        ))}
                      </div>
                    ) : (
                      <div className="margo-profile-memories-tab__timeline">
                        {(() => {
                          const groups = new Map<string, typeof profileMemories>()
                          for (const m of profileMemories) {
                            const y = m.dateStart
                              ? memoryTimelineYear(m.dateStart, m.createdAt)
                              : 'Undated'
                            const list = groups.get(y) || []
                            list.push(m)
                            groups.set(y, list)
                          }
                          const years = [...groups.keys()].sort((a, b) => {
                            if (a === 'Undated') return 1
                            if (b === 'Undated') return -1
                            return Number(b) - Number(a)
                          })
                          return years.map((y) => (
                            <div key={y} className="margo-profile-memories-tab__year">
                              <p className="margo-profile-memories-tab__year-label">{y}</p>
                              {groups.get(y)!.map((m) => (
                                <MemoryCard key={m.id} memory={m} variant="profileTimelineRow" />
                              ))}
                            </div>
                          ))
                        })()}
                      </div>
                    )}
                  </>
                )
              ) : contentTab === 'lyrics' ? (
                ownPosts.length === 0 ? (
                  isOwnProfile ? (
                    <MargoCtaButton
                      href="/compose"
                      linkProps={composeTabLink}
                      icon={<PenLineIcon size={16} color="var(--bg)" />}
                    >
                      Compose
                    </MargoCtaButton>
                  ) : null
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
              ) : contentTab === 'reposts' ? (
                repostsLoading ? (
                  <FeedPostSkeletonList count={2} />
                ) : profileReposts.length === 0 ? (
                  null
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {profileReposts.map(item => (
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
                  null
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
                <FeedPostSkeletonList count={2} />
              ) : lyricBacks.length === 0 ? (
                null
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
              </>
              )}
            </div>
            </div>
          </div>
        </div>
      )}
      <ProfileSignatureLyricSheet
        open={signatureReadOpen && !!profile?.signatureLyric}
        onOpenChange={setSignatureReadOpen}
        lyric={profile?.signatureLyric ?? ''}
        song={profile?.signatureSong}
        artist={profile?.signatureArtist}
        track={signatureTrack}
      />
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
      {previewSong ? (
        <SongPreviewSheet
          song={previewSong}
          onClose={() => setPreviewSong(null)}
          artistUsernameHint={profile?.username}
        />
      ) : null}
      <MargoActionSheet
        open={visitorMenuOpen}
        onOpenChange={setVisitorMenuOpen}
        title="Profile"
        actions={[
          {
            id: 'share',
            label: 'Share profile',
            onSelect: () => { void handleShareProfile() },
          },
          {
            id: 'report',
            label: 'Report',
            onSelect: () => { router.push('/help') },
          },
        ]}
      />
      <MargoActionSheet
        open={signatureSheetOpen}
        onOpenChange={setSignatureSheetOpen}
        title="Signature lyric"
        message={profile?.signatureLyric ? `\u201C${profile.signatureLyric}\u201D` : undefined}
        actions={[
          {
            id: 'edit',
            label: 'Edit',
            disabled: signatureActionBusy,
            onSelect: () => { router.push('/profile/edit') },
          },
          {
            id: 'replace',
            label: 'Replace',
            disabled: signatureActionBusy,
            onSelect: () => { router.push('/profile/edit#signature') },
          },
          {
            id: 'remove',
            label: 'Remove',
            tone: 'destructive',
            disabled: signatureActionBusy,
            onSelect: () => {
              void (async () => {
                setSignatureActionBusy(true)
                const res = await updateSignatureLyric({
                  lyric: '',
                  song: '',
                  artist: '',
                  songId: null,
                })
                setSignatureActionBusy(false)
                if (res.success && profile) {
                  setProfile({
                    ...profile,
                    signatureLyric: null,
                    signatureSong: null,
                    signatureArtist: null,
                    signatureSongId: null,
                  })
                  setSignatureTrack(null)
                }
              })()
            },
          },
          {
            id: 'cancel',
            label: 'Cancel',
            tone: 'cancel',
            onSelect: () => {},
          },
        ]}
      />
    </main>
  )
}