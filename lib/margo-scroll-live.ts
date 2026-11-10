import type { MargoPageResumeEntry } from '@/lib/margo-page-resume'
import { readPageResume, writePageResume } from '@/lib/margo-page-resume'

/** Latest scroll per key — memory first, sessionStorage mirrored on flush. */
const live = new Map<string, MargoPageResumeEntry>()

export function readScrollLive(key: string): MargoPageResumeEntry | null {
  const hit = live.get(key)
  if (hit) return hit
  return readPageResume(key)
}

export function writeScrollLive(
  key: string,
  patch: Partial<Omit<MargoPageResumeEntry, 'at'>> & { y?: number },
) {
  const prev = readScrollLive(key)
  const next: MargoPageResumeEntry = {
    y: typeof patch.y === 'number' ? patch.y : (prev?.y ?? 0),
    tab: patch.tab !== undefined ? patch.tab : prev?.tab,
    anchorId: patch.anchorId !== undefined ? patch.anchorId : prev?.anchorId,
    n: patch.n !== undefined ? patch.n : prev?.n,
    at: Date.now(),
  }
  live.set(key, next)
}

export function flushScrollLive(key?: string) {
  if (key) {
    const row = live.get(key)
    if (row) writePageResume(key, row)
    return
  }
  for (const [k, row] of live) {
    writePageResume(k, row)
  }
}

export function clearScrollLive() {
  live.clear()
}
