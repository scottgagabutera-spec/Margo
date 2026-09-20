import {
  assembleCatalogUnitFromRange,
  type CatalogLyricAtom,
} from '@/lib/catalog-lyric-unit'
import {
  resolveMoodEffect,
  type PromoteMood,
} from '@/lib/promote/mood-effect-map'
import type { GenerateWindowCandidate, ResolvedGenerateMoment } from '@/lib/promote/generate-types'
import { windowsOverlap } from '@/lib/promote/generate-dedup'

function scoreCandidate(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.min(words, 24)
}

export function fillMomentsFromEligible(params: {
  eligible: GenerateWindowCandidate[]
  alreadyResolved: ResolvedGenerateMoment[]
  count: number
  songLines: CatalogLyricAtom[]
  mode: 'auto' | 'directive'
  directive?: string
  dedupMeta: {
    tier: string
    excludedRanges: number[][]
    poolSizeAfterFilter: number
  }
  reasonPrefix?: string
}): ResolvedGenerateMoment[] {
  const out = [...params.alreadyResolved]
  const sorted = [...params.eligible].sort(
    (a, b) => scoreCandidate(b.text) - scoreCandidate(a.text),
  )

  for (const candidate of sorted) {
    if (out.length >= params.count) break
    if (out.some((r) => windowsOverlap(r.lineIndexes, candidate.lineIndexes))) continue

    const unit = assembleCatalogUnitFromRange(
      params.songLines,
      candidate.startLineIndex,
      candidate.endLineIndex,
    )
    if (!unit) continue

    const mapped = resolveMoodEffect(null)
    out.push({
      startLineIndex: unit.startLineIndex,
      endLineIndex: unit.endLineIndex,
      lineIndexes: unit.lineIndexes,
      lyricText: unit.text,
      snippetStartSec: unit.startSec,
      snippetEndSec: unit.endSec,
      mood: mapped.mood,
      reason: params.reasonPrefix || 'Filled from eligible catalog window.',
      atmosphereId: mapped.atmosphereId,
      themeId: mapped.themeId,
      selectionScore: Math.min(1, scoreCandidate(unit.text) / 24),
      selectionReason: {
        mode: params.mode,
        directive: params.directive?.trim() || null,
        mood: mapped.mood,
        modelMood: null,
        model: 'eligible-pool-fill',
        reason: params.reasonPrefix || 'Filled from eligible catalog window.',
        dedupTier: params.dedupMeta.tier,
        excludedRanges: params.dedupMeta.excludedRanges,
        poolSizeAfterFilter: params.dedupMeta.poolSizeAfterFilter,
        unmappedMood: true,
        reusedRange: params.dedupMeta.tier === 'reuse',
        filledByServer: true,
      },
    })
  }

  return out.slice(0, params.count)
}

export function buildMomentFromCandidate(params: {
  candidate: GenerateWindowCandidate
  songLines: CatalogLyricAtom[]
  mood: PromoteMood | null
  modelMood: string
  reason: string
  mode: 'auto' | 'directive'
  directive?: string
  dedupMeta: {
    tier: string
    excludedRanges: number[][]
    poolSizeAfterFilter: number
    reusedRange?: boolean
  }
  unmappedMood: boolean
}): ResolvedGenerateMoment | null {
  const unit = assembleCatalogUnitFromRange(
    params.songLines,
    params.candidate.startLineIndex,
    params.candidate.endLineIndex,
  )
  if (!unit) return null

  const mapped = resolveMoodEffect(params.modelMood)
  const words = unit.text.trim().split(/\s+/).filter(Boolean).length
  const selectionScore = Math.min(1, Math.round((Math.min(words, 24) / 24) * 100) / 100)

  return {
    startLineIndex: unit.startLineIndex,
    endLineIndex: unit.endLineIndex,
    lineIndexes: unit.lineIndexes,
    lyricText: unit.text,
    snippetStartSec: unit.startSec,
    snippetEndSec: unit.endSec,
    mood: params.mood ?? mapped.mood,
    reason: params.reason,
    atmosphereId: mapped.atmosphereId,
    themeId: mapped.themeId,
    selectionScore,
    selectionReason: {
      mode: params.mode,
      directive: params.directive?.trim() || null,
      mood: params.mood ?? mapped.mood,
      modelMood: params.modelMood,
      model: 'gpt-4o-mini',
      reason: params.reason,
      dedupTier: params.dedupMeta.tier,
      excludedRanges: params.dedupMeta.excludedRanges,
      poolSizeAfterFilter: params.dedupMeta.poolSizeAfterFilter,
      unmappedMood: params.unmappedMood,
      reusedRange: params.dedupMeta.tier === 'reuse',
    },
  }
}
