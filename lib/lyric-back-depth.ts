/** How many Lyric Back levels a thread may contain, including the focused row. */
export const LYRIC_BACK_DEPTH_CAP = 8

/** Step cap. Rows stay full width, so a deep level has the same room as the first. */
export const LYRIC_BACK_VISUAL_STEPS = 3

export function lyricBackDepth(depthOffset: number, stackLength: number): number {
  const offset = Number.isFinite(depthOffset) ? Math.max(0, depthOffset) : 0
  const stacked = Number.isFinite(stackLength) ? Math.max(0, stackLength) : 0
  return offset + stacked
}

/** True when a Lyric Back on the focused row would stay within the cap. */
export function lyricBackCanReply(depth: number): boolean {
  return depth < LYRIC_BACK_DEPTH_CAP
}

export function lyricBackVisualStep(stackLength: number): 0 | 1 | 2 | 3 {
  const n = Number.isFinite(stackLength) ? Math.max(0, Math.floor(stackLength)) : 0
  if (n <= 0) return 0
  if (n >= LYRIC_BACK_VISUAL_STEPS) return 3
  return n as 1 | 2
}

export type LyricBackStackAction<T extends { id: string }> =
  | { type: 'drill'; echo: T; depthOffset?: number }
  | { type: 'back' }
  | { type: 'reset' }
  | { type: 'truncate'; depth: number }

/**
 * One stack step. Loading replies is not an action: it cannot push or pop.
 * `back` removes exactly one level. `truncate` matches a history depth.
 */
export function reduceLyricBackStack<T extends { id: string }>(
  stack: readonly T[],
  action: LyricBackStackAction<T>,
): T[] {
  if (action.type === 'reset') return []
  if (action.type === 'truncate') {
    const depth = Number.isFinite(action.depth) ? Math.floor(action.depth) : stack.length
    const nextDepth = Math.max(0, Math.min(stack.length, depth))
    if (nextDepth === stack.length) return stack as T[]
    return stack.slice(0, nextDepth)
  }
  if (action.type === 'back') {
    if (stack.length === 0) return stack as T[]
    return stack.slice(0, -1)
  }
  const offset = action.depthOffset ?? 0
  if (!lyricBackCanReply(lyricBackDepth(offset, stack.length))) return stack as T[]
  if (!action.echo?.id) return stack as T[]
  if (stack.length > 0 && stack[stack.length - 1].id === action.echo.id) return stack as T[]
  return [...stack, action.echo]
}
