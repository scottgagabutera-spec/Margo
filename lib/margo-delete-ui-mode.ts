/** Default inline focused delete. Set NEXT_PUBLIC_MARGO_DELETE_UI=popup to compare old modal. */
export type MargoDeleteUiMode = 'popup' | 'inline'

export function margoDeleteUiMode(): MargoDeleteUiMode {
  if (typeof process !== 'undefined') {
    const v = process.env.NEXT_PUBLIC_MARGO_DELETE_UI
    if (v === 'popup') return 'popup'
  }
  return 'inline'
}
