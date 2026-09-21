'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useStoryRing } from '@/hooks/useStoryRing'
import { StoryViewer } from '@/components/stories/story-viewer'
import type { StoryRingAuthor } from '@/lib/stories/types'

interface StoryRingContextValue {
  authors: StoryRingAuthor[]
  loading: boolean
  signedIn: boolean
  hasActiveStory: (profileId: string | null | undefined) => boolean
  getStoryAuthor: (profileId: string) => StoryRingAuthor | null
  openStory: (profileId: string) => void
  reload: () => void
}

const StoryRingContext = createContext<StoryRingContextValue | null>(null)

export function StoryRingProvider({
  enabled = true,
  children,
}: {
  enabled?: boolean
  children: ReactNode
}) {
  const { authors, loading, signedIn, reload } = useStoryRing({ enabled })
  const [viewerAuthorId, setViewerAuthorId] = useState<string | null>(null)

  const byProfileId = useMemo(
    () => new Map(authors.map((author) => [author.profileId, author])),
    [authors],
  )

  const hasActiveStory = useCallback(
    (profileId: string | null | undefined) =>
      !!profileId && byProfileId.has(profileId),
    [byProfileId],
  )

  const getStoryAuthor = useCallback(
    (profileId: string) => byProfileId.get(profileId) ?? null,
    [byProfileId],
  )

  const openStory = useCallback((profileId: string) => {
    setViewerAuthorId(profileId)
  }, [])

  const closeViewer = useCallback(() => {
    setViewerAuthorId(null)
    void reload()
  }, [reload])

  const value = useMemo<StoryRingContextValue>(() => ({
    authors,
    loading,
    signedIn,
    hasActiveStory,
    getStoryAuthor,
    openStory,
    reload,
  }), [authors, loading, signedIn, hasActiveStory, getStoryAuthor, openStory, reload])

  return (
    <StoryRingContext.Provider value={value}>
      {children}
      {viewerAuthorId && (
        <StoryViewer
          authorProfileId={viewerAuthorId}
          onClose={closeViewer}
        />
      )}
    </StoryRingContext.Provider>
  )
}

export function useStoryRingContext(): StoryRingContextValue | null {
  return useContext(StoryRingContext)
}
