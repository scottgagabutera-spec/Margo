/** Session-scoped path stack for post-thread back (mirrors in-tab pushes, not full browser history). */
const STACK_KEY = 'margo:inAppNavStack'

function sessionStore(): Storage | null {
  if (typeof window !== 'undefined') return window.sessionStorage
  const g = globalThis as { sessionStorage?: Storage }
  return g.sessionStorage ?? null
}

function readStack(): string[] {
  const storage = sessionStore()
  if (!storage) return []
  try {
    const raw = storage.getItem(STACK_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((p): p is string => typeof p === 'string')
  } catch {
    return []
  }
}

function writeStack(stack: string[]) {
  const storage = sessionStore()
  if (!storage) return
  try {
    storage.setItem(STACK_KEY, JSON.stringify(stack.slice(-32)))
  } catch {
    /* ignore quota */
  }
}

export function navStackPaths(): string[] {
  return readStack()
}

export function navStackDepth(): number {
  const s = readStack()
  return Math.max(0, s.length - 1)
}

export function canPopNavStack(): boolean {
  return readStack().length > 1
}

/** Previous distinct path in our stack (where Back should land). */
export function navStackPreviousPath(): string | null {
  const s = readStack()
  if (s.length < 2) return null
  return s[s.length - 2] ?? null
}

export function recordNavPush(pathname: string) {
  const path = pathname.split('?')[0] || '/'
  const s = readStack()
  if (s[s.length - 1] === path) return
  writeStack([...s, path])
}

export function recordNavReplace(pathname: string) {
  const path = pathname.split('?')[0] || '/'
  const s = readStack()
  if (s.length === 0) {
    writeStack([path])
    return
  }
  const next = [...s]
  next[next.length - 1] = path
  writeStack(next)
}

export function recordNavPop() {
  const s = readStack()
  if (s.length <= 1) {
    writeStack(s.length === 1 ? s : [])
    return
  }
  writeStack(s.slice(0, -1))
}

export function resetNavStack(pathname: string) {
  const path = pathname.split('?')[0] || '/'
  writeStack([path])
}

let skipNextPushAsReplace = false

/** Call before router.replace so the pathname tracker updates the stack top instead of pushing. */
export function markNextNavAsReplace() {
  skipNextPushAsReplace = true
}

export function consumeNextNavAsReplace(): boolean {
  if (!skipNextPushAsReplace) return false
  skipNextPushAsReplace = false
  return true
}
