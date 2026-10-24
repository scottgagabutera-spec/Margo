import type { Post } from '@/hooks/usePosts'

type PostsCache = {
  data: Post[] | null
  loadedAt: number
  inflight: Promise<Post[]> | null
}

function getPostsCache(): PostsCache | null {
  const g = globalThis as { __margoPostsCache?: PostsCache }
  return g.__margoPostsCache ?? null
}

/** Called from primary-tab-prefetch to register the module cache for evictions. */
export function bindFeedPostsCache(cache: PostsCache) {
  ;(globalThis as { __margoPostsCache?: PostsCache }).__margoPostsCache = cache
}

const locallyDeleted = new Set<string>()

export function markFeedPostDeleted(postId: string) {
  locallyDeleted.add(postId)
}

export function isFeedPostDeleted(postId: string): boolean {
  return locallyDeleted.has(postId)
}

export function filterOutDeletedPosts<T extends { id: string }>(items: T[]): T[] {
  if (locallyDeleted.size === 0) return items
  return items.filter((item) => !locallyDeleted.has(item.id))
}

export function evictFeedPostFromCache(postId: string) {
  markFeedPostDeleted(postId)
  const cache = getPostsCache()
  if (cache?.data) {
    cache.data = cache.data.filter((p) => p.id !== postId)
    cache.loadedAt = Date.now()
  }
}

/** Test-only reset. */
export function resetFeedPostEvictForTests() {
  locallyDeleted.clear()
}
