/**
 * Keyboard-aware band from visualViewport only (never 100dvh / innerHeight alone).
 */

export type VisualBand = {
  innerHeight: number
  vvHeight: number
  offsetTop: number
  /** Layout Y of keyboard top = offsetTop + effective visual height. */
  keyboardTop: number
  keyboardInset: number
}

const KEYBOARD_OPEN_PX = 80

export function estimateKeyboardHeightPx(innerHeight: number): number {
  return Math.min(311, Math.round(innerHeight * 0.45))
}

type VvMock = {
  open: boolean
  keyboardH: number
  fullH: number
  mode?: 'resizes-visual' | 'resizes-content'
}

function readVvMock(win: Window): VvMock | null {
  const mock = (win as Window & { __margoVvMock?: VvMock }).__margoVvMock
  return mock ?? null
}

export function readVisualBand(win: Window = window): VisualBand {
  const mock = readVvMock(win)
  if (mock) {
    const vvHeight = mock.open ? mock.fullH - mock.keyboardH : mock.fullH
    const offsetTop = 0
    const innerHeight =
      mock.mode === 'resizes-content' && mock.open ? vvHeight : mock.fullH
    const keyboardTop = offsetTop + vvHeight
    const keyboardInset = Math.max(0, innerHeight - keyboardTop)
    const band = { innerHeight, vvHeight, offsetTop, keyboardTop, keyboardInset }
    publishReadVisualBandHook()
    return band
  }

  const innerHeight = win.innerHeight
  const vv = win.visualViewport
  const vvHeight = vv?.height ?? innerHeight
  const offsetTop = vv?.offsetTop ?? 0
  let effectiveVvHeight = vvHeight
  const keyboardInsetRaw = Math.max(0, innerHeight - vvHeight - offsetTop)

  const active = win.document.activeElement as { tagName?: string; type?: string; isContentEditable?: boolean } | null
  const editableFocused =
    !!active?.tagName
    && (active.tagName === 'TEXTAREA'
      || (active.tagName === 'INPUT' && !['button', 'submit', 'checkbox', 'radio', 'file', 'hidden', 'reset', 'image'].includes(active.type ?? ''))
      || !!active.isContentEditable)

  if (editableFocused && keyboardInsetRaw < KEYBOARD_OPEN_PX && vvHeight >= innerHeight - 40) {
    effectiveVvHeight = innerHeight - estimateKeyboardHeightPx(innerHeight) - offsetTop
  }

  const keyboardTop = offsetTop + effectiveVvHeight
  const keyboardInset = Math.max(0, innerHeight - keyboardTop)

  const band = {
    innerHeight,
    vvHeight: effectiveVvHeight,
    offsetTop,
    keyboardTop,
    keyboardInset,
  }
  publishReadVisualBandHook()
  return band
}

function publishReadVisualBandHook() {
  if (typeof window === 'undefined') return
  (window as Window & { __margoReadVisualBand?: () => VisualBand }).__margoReadVisualBand = () =>
    readVisualBand(window)
}
