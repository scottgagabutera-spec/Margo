/** How many Lyric Back levels a thread may contain, including the focused row. */
export const LYRIC_BACK_DEPTH_CAP = 8

/** Indent stops at three steps so a deep thread stays readable. */
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
