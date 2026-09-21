'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useStoryRing } from '@/hooks/useStoryRing'
import { StoryViewer } from '@/components/stories/story-viewer'
import { loadAuthorSlides } from '@/lib/stories/load-author-slides'
import { createClient } from '@/lib/supabase/client'
import type { StoryRingAuthor, StorySlide } from '@/lib/stories/types'

const supabase = createClient()

interface StoryRingContextValue {
  authors: StoryRingAuthor[]
  loading: boolean
  signedIn: boolean
  hasActiveStory: (profileId: string | null | undefined) => boolean
  getStoryAuthor: (profileId: string) => StoryRingAuthor | null
  openStory: (profileId: string) => void
  warmStory: (profileId: string) => void
  registerFeedAuthors: (profileIds: string[]) => void
  reload: () => void
}

const StoryRingContext = createContext<StoryRingContextValue | null>(null)

function mapProfile(row: Record<string, unknown>): {
  username: string
  displayName: string | null
  avatarUrl: string | null
} {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  const rec = (profile ?? {}) as {
    username?: string
    display_name?: string | null
    avatar_url?: string | null
  }
  return {
    username: rec.username || '',
    displayName: rec.display_name ?? null,
    avatarUrl: rec.avatar_url ?? null,
  }
}

export function StoryRingProvider({
  enabled = true,
  children,
}: {
  enabled?: boolean
  children: ReactNode
}) {
  const { authors, loading, signedIn, reload } = useStoryRing({ enabled })
  const { requireAuth } = useAuthGate()
  const [viewerAuthorId, setViewerAuthorId] = useState<string | null>(null)
  const [viewerSlides, setViewerSlides] = useState<StorySlide[]>([])
  const [feedAuthors, setFeedAuthors] = useState<StoryRingAuthor[]>([])

  const cacheRef = useRef(new Map<string, StorySlide[]>())
  const inflightRef = useRef(new Map<string, Promise<StorySlide[]>>())
  const registeredIdsRef = useRef(new Set<string>())

  const byProfileId = useMemo(() => {
    const map = new Map<string, StoryRingAuthor>()
    for (const author of feedAuthors) map.set(author.profileId, author)
    for (const author of authors) map.set(author.profileId, author)
    return map
  }, [authors, feedAuthors])

  const hasActiveStory = useCallback(
    (profileId: string | null | undefined) =>
      !!profileId && byProfileId.has(profileId),
    [byProfileId],
  )

  const getStoryAuthor = useCallback(
    (profileId: string) => byProfileId.get(profileId) ?? null,
    [byProfileId],
  )

  const ensureSlides = useCallback(async (profileId: string): Promise<StorySlide[]> => {
    const cached = cacheRef.current.get(profileId)
    if (cached?.length) return cached
    const inflight = inflightRef.current.get(profileId)
    if (inflight) return inflight
    const request = loadAuthorSlides(profileId)
      .then((slides) => {
        cacheRef.current.set(profileId, slides)
        inflightRef.current.delete(profileId)
        return slides
      })
      .catch((err) => {
        inflightRef.current.delete(profileId)
        throw err
      })
    inflightRef.current.set(profileId, request)
    return request
  }, [])

  const warmStory = useCallback((profileId: string) => {
    void ensureSlides(profileId)
  }, [ensureSlides])

  useEffect(() => {
    if (!enabled || !signedIn) return
    authors.slice(0, 8).forEach((author) => {
      void ensureSlides(author.profileId)
    })
  }, [enabled, signedIn, authors, ensureSlides])

  const registerFeedAuthors = useCallback((profileIds: string[]) => {
    if (!signedIn) return
    const missing = profileIds.filter((id) => {
      if (!id) return false
      if (registeredIdsRef.current.has(id)) return false
      return true
    })
    if (missing.length === 0) return
    missing.forEach((id) => registeredIdsRef.current.add(id))

    const nowIso = new Date().toISOString()
    void (async () => {
      const { data: storyRows, error } = await supabase
        .from('stories')
        .select(`
          id,
          author_profile_id,
          created_at,
          profiles:author_profile_id ( username, display_name, avatar_url )
        `)
        .in('author_profile_id', missing)
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false })

      if (error) {
        missing.forEach((id) => registeredIdsRef.current.delete(id))
        return
      }
      if (!storyRows?.length) return

      const storyIds = storyRows.map((r) => r.id as string)
      const { data: { user } } = await supabase.auth.getUser()
      let seenStoryIds = new Set<string>()
      if (user && storyIds.length > 0) {
        const { data: views } = await supabase
          .from('story_views')
          .select('story_id')
          .eq('viewer_profile_id', user.id)
          .in('story_id', storyIds)
        seenStoryIds = new Set((views || []).map((v) => v.story_id as string))
      }

      const next: StoryRingAuthor[] = []
      const seenAuthors = new Set<string>()
      for (const row of storyRows) {
        const profileId = row.author_profile_id as string
        if (seenAuthors.has(profileId)) continue
        seenAuthors.add(profileId)
        const profile = mapProfile(row as Record<string, unknown>)
        next.push({
          profileId,
          username: profile.username,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          hasUnseen: !seenStoryIds.has(row.id as string),
          latestStoryAt: String(row.created_at),
          isSelf: profileId === user?.id,
        })
      }
      if (next.length === 0) return
      setFeedAuthors((prev) => {
        const merged = new Map(prev.map((a) => [a.profileId, a]))
        for (const author of next) merged.set(author.profileId, author)
        return [...merged.values()]
      })
    })()
  }, [signedIn])

  const openStory = useCallback((profileId: string) => {
    if (!requireAuth()) return
    const cached = cacheRef.current.get(profileId)
    if (cached && cached.length > 0) {
      setViewerSlides(cached)
      setViewerAuthorId(profileId)
      return
    }
    void ensureSlides(profileId).then((slides) => {
      if (slides.length === 0) return
      setViewerSlides(slides)
      setViewerAuthorId(profileId)
    }).catch(() => {
      /* Keep Feed visible — never open a blank Story shell. */
    })
  }, [ensureSlides, requireAuth])

  const closeViewer = useCallback(() => {
    setViewerAuthorId(null)
    setViewerSlides([])
    void reload()
  }, [reload])

  const openNextAuthor = useCallback((fromProfileId: string): boolean => {
    const ids = authors.map((a) => a.profileId)
    const i = ids.indexOf(fromProfileId)
    const nextId = i >= 0 ? ids[i + 1] : undefined
    if (!nextId) return false
    const cached = cacheRef.current.get(nextId)
    if (cached && cached.length > 0) {
      setViewerSlides(cached)
      setViewerAuthorId(nextId)
      return true
    }
    void ensureSlides(nextId).then((slides) => {
      if (slides.length === 0) {
        closeViewer()
        return
      }
      setViewerSlides(slides)
      setViewerAuthorId(nextId)
    }).catch(() => {
      closeViewer()
    })
    return true
  }, [authors, ensureSlides, closeViewer])

  const value = useMemo<StoryRingContextValue>(() => ({
    authors,
    loading,
    signedIn,
    hasActiveStory,
    getStoryAuthor,
    openStory,
    warmStory,
    registerFeedAuthors,
    reload,
  }), [
    authors,
    loading,
    signedIn,
    hasActiveStory,
    getStoryAuthor,
    openStory,
    warmStory,
    registerFeedAuthors,
    reload,
  ])

  const viewerAuthor = viewerAuthorId ? getStoryAuthor(viewerAuthorId) : null

  return (
    <StoryRingContext.Provider value={value}>
      {children}
      {viewerAuthorId && viewerSlides.length > 0 && (
        <StoryViewer
          key={viewerAuthorId}
          authorProfileId={viewerAuthorId}
          authorPreview={viewerAuthor}
          initialSlides={viewerSlides}
          onClose={closeViewer}
          onNextAuthor={() => openNextAuthor(viewerAuthorId)}
        />
      )}
    </StoryRingContext.Provider>
  )
}

export function useStoryRingContext(): StoryRingContextValue | null {
  return useContext(StoryRingContext)
}

export function StoryFeedAuthorSync({ authorIds }: { authorIds: string[] }) {
  const ctx = useStoryRingContext()
  const key = authorIds.filter(Boolean).sort().join(',')
  useEffect(() => {
    if (!ctx || !key) return
    ctx.registerFeedAuthors(key.split(','))
  }, [ctx, key])
  return null
}
