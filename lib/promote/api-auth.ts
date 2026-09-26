import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { requireActivePromoteArtist } from '@/lib/promote/artist-gate'

export async function requirePromoteSession(): Promise<{ userId: string } | null> {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user?.id) return null
  const artist = await requireActivePromoteArtist(supabase, data.user.id)
  if (!artist) return null
  return { userId: data.user.id }
}

const PROMOTE_SESSION_CHECK_TIMEOUT_MS = 12_000

export type PromoteSessionCheckResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'unauthorized' | 'timeout' }

/** Fail fast if Supabase session/profile lookup hangs on OAuth start. */
export async function requirePromoteSessionWithTimeout(
  timeoutMs = PROMOTE_SESSION_CHECK_TIMEOUT_MS,
): Promise<PromoteSessionCheckResult> {
  let timedOut = false
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const session = await Promise.race([
      requirePromoteSession(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          timedOut = true
          resolve(null)
        }, timeoutMs)
      }),
    ])
    if (timedOut) return { ok: false, reason: 'timeout' }
    if (!session) return { ok: false, reason: 'unauthorized' }
    return { ok: true, userId: session.userId }
  } catch {
    return { ok: false, reason: 'unauthorized' }
  } finally {
    if (timer != null) clearTimeout(timer)
  }
}
