/** Ignore visualViewport churn smaller than this (px). */
export const SETTLED_VV_EPSILON_PX = 2

/** Wait for keyboard animation frames to finish before committing layout. */
export const SETTLED_VV_DEBOUNCE_MS = 100

export type VisualViewportSnapshot = {
  height: number
  offsetTop: number
}

export function snapshotsWithinEpsilon(
  a: VisualViewportSnapshot,
  b: VisualViewportSnapshot,
  epsilon = SETTLED_VV_EPSILON_PX,
): boolean {
  return (
    Math.abs(a.height - b.height) < epsilon &&
    Math.abs(a.offsetTop - b.offsetTop) < epsilon
  )
}

export function readVisualViewportSnapshot(): VisualViewportSnapshot {
  if (typeof window === 'undefined') {
    return { height: 0, offsetTop: 0 }
  }
  const vv = window.visualViewport
  return {
    height: vv?.height ?? window.innerHeight,
    offsetTop: vv?.offsetTop ?? 0,
  }
}

export type SettledVisualViewportOptions = {
  debounceMs?: number
  epsilonPx?: number
  onSettled: (snapshot: VisualViewportSnapshot) => void
}

/**
 * Coalesce rapid visualViewport resize/scroll bursts (keyboard open/close) into
 * one settled callback after metrics stop changing.
 */
export function attachSettledVisualViewportListener(
  options: SettledVisualViewportOptions,
): () => void {
  const debounceMs = options.debounceMs ?? SETTLED_VV_DEBOUNCE_MS
  const epsilon = options.epsilonPx ?? SETTLED_VV_EPSILON_PX
  let pending: VisualViewportSnapshot | null = null
  let lastCommitted: VisualViewportSnapshot | null = null
  let raf = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  const commit = () => {
    raf = 0
    if (!pending) return
    const next = pending
    pending = null
    if (lastCommitted && snapshotsWithinEpsilon(lastCommitted, next, epsilon)) return
    lastCommitted = next
    options.onSettled(next)
  }

  const scheduleCommit = () => {
    if (timer != null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(commit)
    }, debounceMs)
  }

  const onViewportChange = () => {
    pending = readVisualViewportSnapshot()
    scheduleCommit()
  }

  onViewportChange()

  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  vv?.addEventListener('resize', onViewportChange)
  vv?.addEventListener('scroll', onViewportChange)
  window.addEventListener('resize', onViewportChange)

  return () => {
    if (timer != null) clearTimeout(timer)
    if (raf) cancelAnimationFrame(raf)
    vv?.removeEventListener('resize', onViewportChange)
    vv?.removeEventListener('scroll', onViewportChange)
    window.removeEventListener('resize', onViewportChange)
  }
}
