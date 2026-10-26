import assert from 'node:assert/strict'
import test from 'node:test'
import { formatMessagePreview, parseMomentMessageBody } from './message-format.ts'

test('parseMomentMessageBody does not throw on null or empty body', () => {
  assert.equal(parseMomentMessageBody(null as unknown as string), null)
  assert.equal(parseMomentMessageBody(undefined as unknown as string), null)
  assert.equal(parseMomentMessageBody(''), null)
})

test('formatMessagePreview survives null body (inbox rows from legacy rows)', () => {
  assert.equal(formatMessagePreview(null as unknown as string), '')
  assert.equal(formatMessagePreview(undefined as unknown as string), '')
})

test('formatMessagePreview still formats moment bodies', () => {
  const body = '"Hello world"\nSong · Artist\nmargo-moment:11111111-1111-4111-8111-111111111111'
  assert.match(formatMessagePreview(body), /Hello world/)
})
