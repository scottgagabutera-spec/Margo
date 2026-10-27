export class FetchTimeoutError extends Error {
  constructor(message = 'Fetch timed out') {
    super(message)
    this.name = 'FetchTimeoutError'
  }
}

/** Abort fetch after ms; rethrows non-timeout errors. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 1500, signal: outerSignal, ...rest } = init
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const onOuterAbort = () => controller.abort()
  outerSignal?.addEventListener('abort', onOuterAbort)
  try {
    return await fetch(input, { ...rest, signal: controller.signal })
  } catch (e) {
    if (controller.signal.aborted) throw new FetchTimeoutError()
    throw e
  } finally {
    clearTimeout(timer)
    outerSignal?.removeEventListener('abort', onOuterAbort)
  }
}
