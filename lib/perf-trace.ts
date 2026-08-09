/**
 * Temporary diagnosis helpers — opt-in via `?perf=1` (client) or
 * `x-margo-perf: 1` / `MARGO_PERF_LOG=1` (server). Strip after measurement.
 */

export function perfRequested(request?: Request): boolean {
  if (process.env.MARGO_PERF_LOG === '1') return true
  if (!request) return false
  if (request.headers.get('x-margo-perf') === '1') return true
  try {
    const url = new URL(request.url)
    return url.searchParams.get('perf') === '1'
  } catch {
    return false
  }
}

export function clientPerfEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return new URLSearchParams(window.location.search).get('perf') === '1'
  } catch {
    return false
  }
}

export function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
}

export async function timed<T>(
  fn: () => Promise<T>,
): Promise<{ value: T; ms: number }> {
  const t0 = nowMs()
  const value = await fn()
  return { value, ms: Math.round(nowMs() - t0) }
}

export function perfLog(label: string, data: Record<string, unknown>): void {
  console.log('[perf]', label, JSON.stringify(data))
}
