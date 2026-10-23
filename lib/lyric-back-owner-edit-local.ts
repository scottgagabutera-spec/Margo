import type { Echo } from '../hooks/useEchoes.ts'

export type LyricBackEditPatch = {
  lyric: string
  song: string
  artist: string
  emotion: string
  songId?: string | null
  snippetStart?: number | null
  snippetEnd?: number | null
  audioUrl?: string | null
  artwork?: string | null
  externalListenUrl?: string | null
}

export function applyEchoListEditPatch(
  echoes: Echo[],
  echoId: string,
  patch: LyricBackEditPatch,
): Echo[] {
  return echoes.map((e) =>
    e.id === echoId
      ? {
          ...e,
          lyric: patch.lyric,
          song: patch.song,
          artist: patch.artist,
          emotion: patch.emotion,
          songId: patch.songId ?? null,
          snippetStart: patch.snippetStart ?? null,
          snippetEnd: patch.snippetEnd ?? null,
          audioUrl: patch.audioUrl ?? null,
          artwork: patch.artwork ?? null,
          externalListenUrl: patch.externalListenUrl ?? null,
        }
      : e,
  )
}

export function patchStackEchoEdit(
  stack: Echo[],
  echoId: string,
  patch: LyricBackEditPatch,
): Echo[] {
  const idx = stack.findIndex((e) => e.id === echoId)
  if (idx === -1) return stack
  const next = [...stack]
  next[idx] = { ...next[idx], ...patch, lyric: patch.lyric, song: patch.song, artist: patch.artist }
  return next
}
