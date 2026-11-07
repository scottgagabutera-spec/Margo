import assert from 'node:assert/strict'
import test from 'node:test'
import { formatMemoryDatePublic } from './date-label.ts'

test('formatMemoryDatePublic day uses short month', () => {
  const s = formatMemoryDatePublic({
    granularity: 'day',
    dateStart: '2022-12-24',
    dateEnd: null,
    showDatePublicly: true,
  })
  assert.equal(s, '24 Dec 2022')
})

test('formatMemoryDatePublic period still happening', () => {
  const s = formatMemoryDatePublic({
    granularity: 'period',
    dateStart: '2019-03-01',
    dateEnd: null,
    showDatePublicly: true,
  })
  assert.equal(s, 'Since Mar 2019')
})

test('formatMemoryDatePublic period range', () => {
  const s = formatMemoryDatePublic({
    granularity: 'period',
    dateStart: '2019-03-01',
    dateEnd: '2020-08-01',
    showDatePublicly: true,
  })
  assert.equal(s, 'Mar 2019 to Aug 2020')
})
