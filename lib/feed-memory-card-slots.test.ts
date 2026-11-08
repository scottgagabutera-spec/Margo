import test from 'node:test'
import assert from 'node:assert/strict'
import { lyricOrdinalBlockedForMemoryCard, planMemoryCardPlacements } from './feed-memory-card-slots.ts'

test('short feed uses start placement only', () => {
  const plan = planMemoryCardPlacements(5, true)
  assert.equal(plan.length, 1)
  assert.equal(plan[0]?.placement, 'start')
})

test('long feed spaces cards about every 12 lyrics', () => {
  const plan = planMemoryCardPlacements(40, true)
  const ordinals = plan.filter((p) => p.placement === 'after')
  assert.ok(ordinals.length >= 2)
  for (let i = 1; i < ordinals.length; i++) {
    const prev = ordinals[i - 1] as { lyricOrdinal: number }
    const cur = ordinals[i] as { lyricOrdinal: number }
    assert.ok(cur.lyricOrdinal - prev.lyricOrdinal >= 4)
  }
})

test('blocked ordinals avoid carousel multiples of six', () => {
  assert.equal(lyricOrdinalBlockedForMemoryCard(6, 40), true)
  assert.equal(lyricOrdinalBlockedForMemoryCard(12, 40), true)
  assert.equal(lyricOrdinalBlockedForMemoryCard(11, 40), true)
})

test('forty lyric feed plans three in feed slots', () => {
  const plan = planMemoryCardPlacements(40, true)
  assert.equal(plan.length, 3)
  const ordinals = plan
    .filter((p) => p.placement === 'after')
    .map((p) => (p as { lyricOrdinal: number }).lyricOrdinal)
  assert.deepEqual(ordinals, [15, 27, 39])
})
