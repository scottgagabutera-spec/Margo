import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  FEED_VIBE_CHIP_KEYS,
  feedFilterToChipKey,
  feedVibeChipLabel,
} from './feed-vibe-chips.ts'

describe('feed vibe chips', () => {
  it('labels All and a known vibe', () => {
    assert.equal(feedVibeChipLabel('ALL'), 'All')
    assert.equal(feedVibeChipLabel('HOPE'), 'Hope')
    assert.equal(feedVibeChipLabel('SENDIT'), 'Send It')
  })

  it('maps normalizeEmotion-style keys to chip keys', () => {
    assert.equal(feedFilterToChipKey('ALL'), 'ALL')
    assert.equal(feedFilterToChipKey('hope'), 'HOPE')
    assert.equal(feedFilterToChipKey('SENDIT'), 'SENDIT')
  })

  it('includes every picker emotion as a chip', () => {
    assert.ok(FEED_VIBE_CHIP_KEYS.length >= 10)
    assert.ok(FEED_VIBE_CHIP_KEYS.includes('CHILL'))
  })
})
