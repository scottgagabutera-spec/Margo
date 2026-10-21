import { createHash } from 'node:crypto'

export type LyricsChecksumLine = {
  lineIndex: number
  text: string
  startSec: number
  endSec: number
}

/** Stable hash of ordered lyric timing + text — cache invalidates when lyrics change. */
export function computeLyricsChecksum(lines: LyricsChecksumLine[]): string {
  const ordered = [...lines].sort((a, b) => a.lineIndex - b.lineIndex)
  const payload = ordered
    .map((l) => `${l.lineIndex}|${l.startSec}|${l.endSec}|${l.text.trim()}`)
    .join('\n')
  return createHash('sha256').update(payload, 'utf8').digest('hex')
}
