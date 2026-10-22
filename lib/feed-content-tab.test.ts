import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyFeedContentTab,
  feedTabQueryValue,
  parseFeedContentTab,
} from './feed-content-tab.ts'

describe('feed content tab URL', () => {
  it('defaults to lyrics', () => {
    assert.equal(parseFeedContentTab(null), 'lyrics')
    assert.equal(parseFeedContentTab(''), 'lyrics')
    assert.equal(parseFeedContentTab('lyrics'), 'lyrics')
  })

  it('parses shorts tab', () => {
    assert.equal(parseFeedContentTab('shorts'), 'shorts')
    assert.equal(parseFeedContentTab(' Shorts '), 'shorts')
  })

  it('preserves vibe when switching tab', () => {
    const params = new URLSearchParams('vibe=hope&highlight=abc')
    const next = applyFeedContentTab(params, 'shorts')
    assert.equal(next.get('tab'), 'shorts')
    assert.equal(next.get('vibe'), 'hope')
    assert.equal(next.get('highlight'), 'abc')
    const back = applyFeedContentTab(next, 'lyrics')
    assert.equal(back.get('tab'), null)
    assert.equal(back.get('vibe'), 'hope')
  })

  it('feedTabQueryValue', () => {
    assert.equal(feedTabQueryValue('lyrics'), null)
    assert.equal(feedTabQueryValue('shorts'), 'shorts')
  })
})
