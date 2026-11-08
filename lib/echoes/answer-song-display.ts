import type { EchoSongPayload, EchoSongPayloadItem } from './types.ts'

export function echoPrimarySong(payload: EchoSongPayload | null | undefined): EchoSongPayloadItem | null {
  const songs = payload?.songs ?? []
  return songs[0] ?? null
}

export function echoExtraSongCount(payload: EchoSongPayload | null | undefined): number {
  const n = payload?.songs?.length ?? 0
  return n > 1 ? n - 1 : 0
}

export function echoExtraSongLabel(payload: EchoSongPayload | null | undefined): string | null {
  const extra = echoExtraSongCount(payload)
  if (extra === 0) return null
  if (extra === 1) return 'Plus 1 more'
  return `Plus ${extra} more`
}
