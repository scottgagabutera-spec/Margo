import type { PostLine } from '@/lib/post-lines'

/** Hero: single moment, ≤2 lines, under ~80 characters. Multi-moment is always compact. */
export function feedLyricLayoutMode(lines: PostLine[]): 'hero' | 'compact' {
  if (lines.length !== 1) return 'compact'
  const trimmed = (lines[0]?.text || '').trim()
  if (!trimmed) return 'compact'
  const lineBreaks = trimmed.split('\n').length
  if (lineBreaks > 2) return 'compact'
  if (trimmed.length > 80) return 'compact'
  return 'hero'
}

export function feedLyricNeedsClamp(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (trimmed.split('\n').length > 4) return true
  return trimmed.length > 180
}

const EXPAND_PREFIX = 'margo-feed-lyric-expanded:'

export function readLyricExpandedSession(postId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(EXPAND_PREFIX + postId) === '1'
  } catch {
    return false
  }
}

export function writeLyricExpandedSession(postId: string, expanded: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (expanded) sessionStorage.setItem(EXPAND_PREFIX + postId, '1')
    else sessionStorage.removeItem(EXPAND_PREFIX + postId)
  } catch { /* ignore */ }
}

export function formatMomentClock(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec))
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

export function sumSegmentDuration(segments: { startSec: number; endSec: number }[]): number {
  return segments.reduce((sum, s) => sum + Math.max(0, s.endSec - s.startSec), 0)
}

export function formatEchoBadge(count: number): string | null {
  if (count <= 0) return null
  return count > 9 ? '9+' : String(count)
}
