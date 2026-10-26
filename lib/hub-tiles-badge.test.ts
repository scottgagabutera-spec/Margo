import assert from 'node:assert/strict'
import test from 'node:test'
import { hubTileBadgeLabel } from './hub/tiles.ts'

test('hub badges hidden at zero', () => {
  assert.equal(hubTileBadgeLabel(0), '')
})

test('hub badges cap at 9+', () => {
  assert.equal(hubTileBadgeLabel(9), '9')
  assert.equal(hubTileBadgeLabel(10), '9+')
})
