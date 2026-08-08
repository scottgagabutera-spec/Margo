/**
 * Cross-tab auth sync (Hardening).
 * HttpOnly cookies are invisible to JS — we explicitly announce
 * session clear / change so other tabs can update memory + UI.
 */

const CHANNEL = 'margo-auth'

export type AuthBroadcastMessage =
  | { type: 'session-cleared' }
  | { type: 'session-changed' }

function post(message: AuthBroadcastMessage) {
  if (typeof BroadcastChannel === 'undefined') return
  try {
    const bc = new BroadcastChannel(CHANNEL)
    bc.postMessage(message)
    bc.close()
  } catch {
    // unsupported / restricted context
  }
}

/** Explicit logout and failSession (via signOutBrowser). */
export function broadcastSessionCleared() {
  post({ type: 'session-cleared' })
}

/** Password login / OAuth boot that newly establishes a session. */
export function broadcastSessionChanged() {
  post({ type: 'session-changed' })
}

/** Subscribe; returns unsubscribe. No-op if BroadcastChannel missing. */
export function subscribeAuthBroadcast(
  handler: (message: AuthBroadcastMessage) => void,
): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {}
  try {
    const bc = new BroadcastChannel(CHANNEL)
    const onMessage = (event: MessageEvent) => {
      const data = event.data as AuthBroadcastMessage | null
      if (!data || (data.type !== 'session-cleared' && data.type !== 'session-changed')) {
        return
      }
      handler(data)
    }
    bc.addEventListener('message', onMessage)
    return () => {
      bc.removeEventListener('message', onMessage)
      bc.close()
    }
  } catch {
    return () => {}
  }
}
