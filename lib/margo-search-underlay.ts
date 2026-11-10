import { readActiveScrollTop } from '@/components/primary-tab-shell'
import { safeSearchFromPath } from '@/lib/search-scope'

const FREEZE_KEY = 'margo-search-underlay'
const QUERY_RAN_KEY = 'margo-search-query-ran'

type FreezeRow = { path: string; y: number; at: number }

function readFreeze(): FreezeRow | null {
  try {
    const raw = sessionStorage.getItem(FREEZE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as FreezeRow
    if (typeof parsed.path !== 'string' || typeof parsed.y !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

function writeFreeze(row: FreezeRow) {
  try {
    sessionStorage.setItem(FREEZE_KEY, JSON.stringify(row))
    sessionStorage.removeItem(QUERY_RAN_KEY)
  } catch {
    /* */
  }
}

export function freezeSearchUnderlay(from: string | null | undefined) {
  if (typeof window === 'undefined') return
  const path = safeSearchFromPath(from)
  if (!path) return
  const y =
    path.split('?')[0] === '/feed' || path === '/discover' || path === '/compose' || path === '/you'
      ? readActiveScrollTop()
      : window.scrollY || document.documentElement.scrollTop || 0
  writeFreeze({ path, y, at: Date.now() })
}

export function markSearchQueryRan() {
  try {
    sessionStorage.setItem(QUERY_RAN_KEY, '1')
  } catch {
    /* */
  }
}

export function peekSearchQueryRan(): boolean {
  try {
    return sessionStorage.getItem(QUERY_RAN_KEY) === '1'
  } catch {
    return false
  }
}

/** Apply frozen Y when returning from search with no query. Returns applied y or null. */
export function consumeSearchUnderlayRestore(currentPath: string): number | null {
  if (peekSearchQueryRan()) {
    try {
      sessionStorage.removeItem(QUERY_RAN_KEY)
      sessionStorage.removeItem(FREEZE_KEY)
    } catch {
      /* */
    }
    return null
  }
  const snap = readFreeze()
  if (!snap) return null
  const here = currentPath.split('?')[0]
  const saved = snap.path.split('?')[0]
  if (here !== saved) return null
  try {
    sessionStorage.removeItem(FREEZE_KEY)
  } catch {
    /* */
  }
  return snap.y
}

export function clearSearchUnderlayFreeze() {
  try {
    sessionStorage.removeItem(FREEZE_KEY)
    sessionStorage.removeItem(QUERY_RAN_KEY)
  } catch {
    /* */
  }
}
