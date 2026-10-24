/** Which delete confirm UI is active. Default popup until Scott approves inline. */
export type MargoDeleteUiMode = 'popup' | 'inline'

export function margoDeleteUiMode(): MargoDeleteUiMode {
  if (typeof process !== 'undefined') {
    const v = process.env.NEXT_PUBLIC_MARGO_DELETE_UI
    if (v === 'inline') return 'inline'
  }
  return 'popup'
}
