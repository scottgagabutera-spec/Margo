export type CuratedMomentDraft = {
  startLineIndex: number
  endLineIndex: number
  reason: string
  primaryVibe: string
  confidence: number
}

export type CuratedMomentStored = {
  startLineIndex: number
  endLineIndex: number
  lineIndexes: number[]
  text: string
  reason: string
  primaryVibe: string
  confidence: number
  startSec: number
  endSec: number
}

export type SongLyricLineInput = {
  lineIndex: number
  text: string
  startSec: number
  endSec: number
  vibes?: string[]
}
