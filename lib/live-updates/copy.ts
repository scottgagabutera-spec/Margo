export type LiveUpdateKind = 'posts' | 'artists' | 'songs' | 'memories'

export function liveUpdateLabel(kind: LiveUpdateKind, count: number): string {
  const n = Math.max(1, count)
  if (kind === 'posts') return n === 1 ? '1 new post' : `${n} new posts`
  if (kind === 'artists') return n === 1 ? '1 new artist' : `${n} new artists`
  if (kind === 'songs') return n === 1 ? '1 new song' : `${n} new songs`
  return n === 1 ? '1 new memory' : `${n} new memories`
}
