import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatListeningPeriodSummary,
  formatWeekArchiveLabel,
  listeningPeriodChoices,
  shiftWeek,
  weekRangeContaining,
} from './listening-period.ts'

test('week range is Monday through Sunday', () => {
  const ref = new Date(2026, 10, 8)
  const w = weekRangeContaining(ref)
  assert.equal(w.start.getDay(), 1)
  assert.equal(w.end.getDay(), 0)
  assert.equal(w.startIso, '2026-11-02')
  assert.equal(w.endIso, '2026-11-08')
})

test('week archive label', () => {
  const label = formatWeekArchiveLabel('2026-11-02', '2026-11-08')
  assert.equal(label, 'Week of 2 to 8 Nov 2026')
})

test('active week shows This week', () => {
  const w = weekRangeContaining(new Date(2026, 10, 8))
  const label = formatListeningPeriodSummary({
    type: 'week',
    startIso: w.startIso,
    endIso: w.endIso,
    now: new Date(2026, 10, 8),
  })
  assert.equal(label, 'This week')
})

test('month and year choices return four rows', () => {
  const now = new Date(2026, 10, 8)
  assert.equal(listeningPeriodChoices('week', now).length, 4)
  assert.equal(listeningPeriodChoices('month', now).length, 4)
  assert.equal(listeningPeriodChoices('year', now).length, 4)
})

test('week crossing two months in choice sublabel', () => {
  const now = new Date(2026, 10, 3)
  const last = shiftWeek(now, 1)
  assert.equal(last.start.getMonth(), 9)
  assert.equal(last.end.getMonth(), 10)
})

test('year boundary last year label', () => {
  const now = new Date(2026, 0, 15)
  const choices = listeningPeriodChoices('year', now)
  assert.equal(choices[1]?.heading, 'Last year')
  assert.equal(choices[1]?.sub, '2025')
})
