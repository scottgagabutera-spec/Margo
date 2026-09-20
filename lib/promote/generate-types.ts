import type { PromoteMood } from '@/lib/promote/mood-effect-map'

export type GeneratePromoteMode = 'auto' | 'directive'

export interface GenerateWindowCandidate {
  startLineIndex: number
  endLineIndex: number
  lineIndexes: number[]
  text: string
}

export interface ModelGenerateWindow {
  startLineIndex: number
  endLineIndex: number
  mood: string
  reason: string
}

export interface ResolvedGenerateMoment {
  startLineIndex: number
  endLineIndex: number
  lineIndexes: number[]
  lyricText: string
  snippetStartSec: number
  snippetEndSec: number
  mood: PromoteMood | null
  reason: string
  atmosphereId: string
  themeId: string
  selectionScore: number
  selectionReason: Record<string, unknown>
}

export interface GenerateDedupMeta {
  tier: string
  excludedRanges: number[][]
  poolSizeAfterFilter: number
}
