'use client'

import { createContext, useContext } from 'react'

export type FeedPostEvictFn = (postId: string) => void

const FeedPostEvictContext = createContext<FeedPostEvictFn | null>(null)

export function FeedPostEvictProvider({
  evict,
  children,
}: {
  evict: FeedPostEvictFn
  children: React.ReactNode
}) {
  return (
    <FeedPostEvictContext.Provider value={evict}>{children}</FeedPostEvictContext.Provider>
  )
}

export function useFeedPostEvict(): FeedPostEvictFn | null {
  return useContext(FeedPostEvictContext)
}
