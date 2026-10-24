import type { Post } from '@/hooks/usePosts'

const KEY = 'margo:postThreadSeed'
const MAX_AGE_MS = 120_000

type SeedPayload = { id: string; post: Post; at: number }

export function stashPostThreadSeed(postId: string, post: Post) {
  if (typeof window === 'undefined') return
  try {
    const payload: SeedPayload = { id: postId, post, at: Date.now() }
    sessionStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

export function peekPostThreadSeed(postId: string): Post | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SeedPayload
    if (parsed.id !== postId) return null
    if (Date.now() - parsed.at > MAX_AGE_MS) return null
    return parsed.post
  } catch {
    return null
  }
}

export function clearPostThreadSeed(postId: string) {
  if (typeof window === 'undefined') return
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as SeedPayload
    if (parsed.id === postId) sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
