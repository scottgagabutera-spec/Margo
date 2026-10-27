import assert from 'node:assert/strict'
import test from 'node:test'
import { isHubPrimaryScrollSurface, isHubSheetFlushTopPath } from './hub-overlay-surfaces.ts'

test('Hub scroll dismiss only on primary tab routes', () => {
  assert.equal(isHubPrimaryScrollSurface('/feed'), true)
  assert.equal(isHubPrimaryScrollSurface('/discover'), true)
  assert.equal(isHubPrimaryScrollSurface('/signin'), false)
  assert.equal(isHubPrimaryScrollSurface('/search'), false)
  assert.equal(isHubPrimaryScrollSurface('/'), false)
})

test('Hub sheet flush top on auth routes', () => {
  assert.equal(isHubSheetFlushTopPath('/signin'), true)
  assert.equal(isHubSheetFlushTopPath('/feed'), false)
})
