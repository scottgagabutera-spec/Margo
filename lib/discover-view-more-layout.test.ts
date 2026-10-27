import assert from 'node:assert/strict'
import test from 'node:test'
import {
  discoverVmColumnCount,
  discoverVmHeaderGap,
  discoverVmPadX,
  discoverVmVisibleItems,
  discoverVmHasMore,
  DISCOVER_VM_TITLE,
} from './discover-view-more-layout.ts'

const VIEWPORTS = [
  { w: 320, label: '320x568' },
  { w: 360, label: '360x640' },
  { w: 390, label: '390x844' },
  { w: 412, label: '412x915' },
  { w: 834, label: '834x1194' },
  { w: 1280, label: '1280x720' },
  { w: 1536, label: '1536x864' },
  { w: 2560, label: '2560x1440' },
] as const

test('page title token is 16px Geist 600', () => {
  assert.equal(DISCOVER_VM_TITLE.fontSize, '16px')
  assert.equal(DISCOVER_VM_TITLE.fontWeight, 600)
  assert.match(DISCOVER_VM_TITLE.fontFamily, /geist/i)
})

test('header gap under nav matches spec by viewport', () => {
  assert.equal(discoverVmHeaderGap(390), 8)
  assert.equal(discoverVmHeaderGap(834), 28)
  assert.equal(discoverVmHeaderGap(1280), 28)
  assert.equal(discoverVmHeaderGap(2560), 40)
})

test('side padding matches spec by viewport', () => {
  assert.equal(discoverVmPadX(390), 16)
  assert.equal(discoverVmPadX(834), 28)
  assert.equal(discoverVmPadX(1280), 48)
  assert.equal(discoverVmPadX(1536), 64)
})

test('moments column counts at reference viewports', () => {
  const expected: Record<number, number> = {
    320: 2,
    360: 2,
    390: 2,
    412: 2,
    834: 3,
    1280: 5,
    1536: 5,
    2560: 6,
  }
  for (const { w } of VIEWPORTS) {
    assert.equal(discoverVmColumnCount('moments', w), expected[w], `moments cols @${w}`)
  }
})

test('songs column counts at reference viewports', () => {
  const expected: Record<number, number> = {
    320: 3,
    360: 3,
    390: 3,
    412: 3,
    834: 5,
    1280: 7,
    1536: 7,
    2560: 8,
  }
  for (const { w } of VIEWPORTS) {
    assert.equal(discoverVmColumnCount('songs', w), expected[w], `songs cols @${w}`)
  }
})

test('resonance column counts at reference viewports', () => {
  assert.equal(discoverVmColumnCount('resonance', 390), 1)
  assert.equal(discoverVmColumnCount('resonance', 834), 2)
  assert.equal(discoverVmColumnCount('resonance', 1280), 3)
})

test('artists column counts at reference viewports', () => {
  assert.equal(discoverVmColumnCount('artists', 390), 3)
  assert.equal(discoverVmColumnCount('artists', 834), 5)
  assert.equal(discoverVmColumnCount('artists', 1280), 8)
})

test('render batch window grows in chunks', () => {
  const items = Array.from({ length: 50 }, (_, i) => i)
  assert.deepEqual(discoverVmVisibleItems(items, 20), items.slice(0, 20))
  assert.equal(discoverVmHasMore(items, 20), true)
  assert.equal(discoverVmHasMore(items, 50), false)
})
