import type { EchoSongPayload } from './types.ts'

export function echoSongLineFromPayload(payload: EchoSongPayload, max = 2): string {
  const titles = payload.songs.map((s) => s.songTitle).filter(Boolean)
  if (titles.length === 0) return ''
  if (titles.length <= max) return titles.join(', ')
  return `${titles.slice(0, max).join(', ')} +${titles.length - max}`
}
