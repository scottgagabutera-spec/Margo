/**
 * Cross-tab auth sync (Hardening).
 * HttpOnly cookies are invisible to JS — we explicitly announce
 * session clear / change so other tabs can update memory + UI.
 *
 * Important: posting creates a *new* BroadcastChannel. Sibling BC objects
 * in the *same* document also receive the message (HTML broadcast model).
 * We suppress that same-tab echo so cold boot does not soft-rehydrate twice.
 */

const CHANNEL = 'margo-auth'

export type AuthBroadcastMessage =
  | { type: 'session-cleared' }
  | { type: 'session-changed' }

/** Consumed by the next session-changed listener in this JS realm. */
let ignoreNextSessionChanged = false

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

/**
 * Password login / OAuth return that newly establishes a session for peers.
 * Marks same-tab echo for ignore (sibling BroadcastChannel in this document).
 */
export function broadcastSessionChanged() {
  ignoreNextSessionChanged = true
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
      if (data.type === 'session-changed' && ignoreNextSessionChanged) {
        ignoreNextSessionChanged = false
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
