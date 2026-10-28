/** While the keyboard is opening, never reduce hero shift (avoids up-then-down bounce). */
export function applyMonotonicLandingShift(
  prevShiftPx: number,
  planShiftPx: number,
  mode: 'open' | 'close' | 'idle',
): number {
  if (mode === 'open') return Math.max(prevShiftPx, planShiftPx)
  if (mode === 'close') return Math.min(prevShiftPx, planShiftPx)
  return planShiftPx
}

export function landingKeyboardMode(
  keyboardInsetPx: number,
  prevInsetPx: number,
  searchActive: boolean,
): 'open' | 'close' | 'idle' {
  if (!searchActive) return keyboardInsetPx > 2 ? 'close' : 'idle'
  if (keyboardInsetPx <= 2) return 'idle'
  if (keyboardInsetPx >= prevInsetPx - 2) return 'open'
  return 'close'
}
