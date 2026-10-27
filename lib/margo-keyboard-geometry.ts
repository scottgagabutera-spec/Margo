export type VisualBand = {
  innerHeight: number
  vvHeight: number
  offsetTop: number
  keyboardTop: number
  keyboardInset: number
}

const KEYBOARD_OPEN_PX = 80

export function estimateKeyboardHeightPx(innerHeight: number): number {
  return Math.min(311, Math.round(innerHeight * 0.45))
}

export function readVisualBand(win: Window = window): VisualBand {
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

  return {
    innerHeight,
    vvHeight: effectiveVvHeight,
    offsetTop,
    keyboardTop,
    keyboardInset,
  }
}
