/**
 * Offline verification for Generate count + second-press resolution.
 * Run: node scripts/test-generate-logic.mjs
 */
import { buildGenerateWindowCandidates } from '../lib/promote/generate-catalog-moments.ts'
import { applyGenerateDedupTiers } from '../lib/promote/generate-dedup.ts'
import { resolveModelWindowToEligible } from '../lib/promote/resolve-generate-window.ts'
import { fillMomentsFromEligible } from '../lib/promote/generate-fill-moments.ts'

function makeLines(n) {
  return Array.from({ length: n }, (_, i) => ({
    lineIndex: i,
    text: `Line ${i} with enough words to be promotable`,
    startSec: i * 3,
    endSec: i * 3 + 2.5,
  }))
}

const lines = makeLines(40)
const all = buildGenerateWindowCandidates(lines)
console.log('40-line song candidate windows:', all.length)

const firstPick = all[10]
const usedRows = [{
  source_line_indexes: firstPick.lineIndexes,
  selection_score: 0.5,
  created_at: new Date().toISOString(),
}]

const { eligible, meta } = applyGenerateDedupTiers(all, usedRows)
console.log('After first generate dedup tier:', meta.tier, 'eligible:', eligible.length)

// Simulate model returning wrong indexes (array position instead of line_index)
const badPick = { startLineIndex: 11, endLineIndex: 11, mood: 'HYPE', reason: 'hook' }
const resolvedBad = resolveModelWindowToEligible(badPick, lines, eligible)
console.log('Resolve position-style pick:', resolvedBad ? `${resolvedBad.startLineIndex}-${resolvedBad.endLineIndex}` : 'null')

// Simulate model returning previously used window (second press failure case)
const stalePick = {
  startLineIndex: firstPick.startLineIndex,
  endLineIndex: firstPick.endLineIndex,
  mood: 'HOPE',
  reason: 'repeat',
}
const resolvedStale = resolveModelWindowToEligible(stalePick, lines, eligible)
console.log('Resolve stale/excluded pick:', resolvedStale ? 'matched (bad)' : 'null (expected)')

const filled = fillMomentsFromEligible({
  eligible,
  alreadyResolved: [],
  count: 3,
  songLines: lines,
  mode: 'auto',
  dedupMeta: meta,
})
console.log('Fill to count=3 after dedup:', filled.length, 'ranges:', filled.map((m) => m.lineIndexes.join('-')).join(', '))

if (filled.length < 3) {
  console.error('FAIL: expected 3 distinct windows on 40-line song after one used range')
  process.exit(1)
}

console.log('OK')
