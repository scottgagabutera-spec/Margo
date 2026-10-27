export const MARGO_FOOTER_SHEET_HISTORY_KEY = 'margoFooterSheet'

export type FooterSheetHistoryState = {
  [MARGO_FOOTER_SHEET_HISTORY_KEY]?: boolean
}

export function isFooterSheetHistoryState(state: unknown): state is FooterSheetHistoryState {
  return (
    typeof state === 'object'
    && state !== null
    && (state as FooterSheetHistoryState)[MARGO_FOOTER_SHEET_HISTORY_KEY] === true
  )
}

/** Push a history entry when opening the sheet (Android Back closes sheet). */
export function pushFooterSheetHistory(): void {
  if (typeof window === 'undefined') return
  window.history.pushState({ [MARGO_FOOTER_SHEET_HISTORY_KEY]: true }, '')
}

/** Pop the sheet history entry if we pushed one. */
export function popFooterSheetHistoryIfNeeded(pushed: boolean): void {
  if (!pushed || typeof window === 'undefined') return
  window.history.back()
}
