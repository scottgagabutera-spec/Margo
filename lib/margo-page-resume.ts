/**
 * Tiny scroll/tab resume entries in sessionStorage. Restore never fetches.
 */

export const MARGO_PAGE_RESUME_KEY = 'margo-page-resume-v1'
export const MARGO_PAGE_RESUME_MAX_ENTRIES = 32

export type MargoPageResumeEntry = {
  y: number
  tab?: string
  anchorId?: string | null
  /** Extra client state (e.g. batched list visible count). */
  n?: number
  at: number
}

type ResumeMap = Record<string, MargoPageResumeEntry>

function readMap(): ResumeMap {
  if (typeof sessionStorage === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(MARGO_PAGE_RESUME_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ResumeMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeMap(map: ResumeMap) {
  if (typeof sessionStorage === 'undefined') return
  try {
    const keys = Object.keys(map)
    if (keys.length > MARGO_PAGE_RESUME_MAX_ENTRIES) {
      const sorted = keys.sort(
        (a, b) => (map[b]?.at ?? 0) - (map[a]?.at ?? 0),
      )
      for (const drop of sorted.slice(MARGO_PAGE_RESUME_MAX_ENTRIES)) {
        delete map[drop]
      }
    }
    sessionStorage.setItem(MARGO_PAGE_RESUME_KEY, JSON.stringify(map))
  } catch {
    /* private mode */
  }
}

export function readPageResume(key: string): MargoPageResumeEntry | null {
  const map = readMap()
  const row = map[key]
  if (!row || typeof row.y !== 'number') return null
  return row
}

export function writePageResume(
  key: string,
  patch: Partial<Omit<MargoPageResumeEntry, 'at'>> & { y?: number },
) {
  const map = readMap()
  const prev = map[key]
  const next: MargoPageResumeEntry = {
    y: typeof patch.y === 'number' ? patch.y : (prev?.y ?? 0),
    tab: patch.tab !== undefined ? patch.tab : prev?.tab,
    anchorId: patch.anchorId !== undefined ? patch.anchorId : prev?.anchorId,
    n: patch.n !== undefined ? patch.n : prev?.n,
    at: Date.now(),
  }
  map[key] = next
  writeMap(map)
}

export function clearPageResume(key: string) {
  const map = readMap()
  if (!(key in map)) return
  delete map[key]
  writeMap(map)
}

export function clearAllPageResumes() {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(MARGO_PAGE_RESUME_KEY)
  } catch {
    /* */
  }
}

export function pageResumeKeyForPath(pathname: string): string {
  const path = pathname.split('?')[0] || '/'
  return path
}

export function profileResumeKey(username: string): string {
  return `profile:${username.toLowerCase()}`
}
