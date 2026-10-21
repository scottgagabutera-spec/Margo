import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  FEED_CARD_LYRIC_CLASS,
  FEED_CARD_LYRIC_CLAMP_CLASS,
  FEED_CARD_LYRIC_ROW_CLASS,
} from './post-card-lyric-class.ts'

describe('feed post-card lyric class uniformity', () => {
  it('exports a single primary lyric class token', () => {
    assert.equal(FEED_CARD_LYRIC_CLASS, 'margo-feed-lyric margo-post-card__lyric')
    assert.ok(FEED_CARD_LYRIC_CLAMP_CLASS.startsWith(FEED_CARD_LYRIC_CLASS))
    assert.ok(FEED_CARD_LYRIC_ROW_CLASS.startsWith(FEED_CARD_LYRIC_CLASS))
  })

  it('PostCardLyricSection and PostCard row use only canonical classes', () => {
    const layout = fs.readFileSync('components/post-card-feed-layout.tsx', 'utf8')
    const card = fs.readFileSync('components/post-card.tsx', 'utf8')
    assert.ok(layout.includes('FEED_CARD_LYRIC_CLASS'), 'feed layout must import FEED_CARD_LYRIC_CLASS')
    assert.ok(layout.includes('FEED_CARD_LYRIC_CLAMP_CLASS'))
    assert.ok(!layout.includes("'margo-feed-lyric margo-post-card__lyric'"), 'no duplicated literal class string')
    assert.ok(card.includes('FEED_CARD_LYRIC_ROW_CLASS'))
    assert.ok(!card.includes('feedLyricLengthClass'), 'no length-based lyric classes')
  })

  it('globals define lyric token once (no hero override on feed card body)', () => {
    const css = fs.readFileSync('app/globals.css', 'utf8')
    assert.match(css, /--feed-type-lyric:\s*1\.0625rem/)
    assert.match(css, /--feed-type-lyric-lh:\s*1\.55/)
    assert.ok(!css.includes('.margo-post-card__lyric-zone--hero'))
  })
})
