import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

describe('posts/lyric-back API route', () => {
  const route = fs.readFileSync('app/api/posts/lyric-back/route.ts', 'utf8')

  it('POST enforces depth cap before insert', () => {
    assert.match(route, /lyricBackPostDepth/)
    assert.match(route, /lyricBackChildDepthAllowed/)
    assert.match(route, /lyricBackDepthCapErrorMessage/)
  })

  it('PATCH validates owner write with rate limit and server moderation', () => {
    assert.match(route, /export async function PATCH/)
    assert.match(route, /posts\/lyric-back-patch/)
    assert.match(route, /parseLyricBackWriteBody/)
    assert.match(route, /moderateOwnedPostText/)
    assert.match(route, /You can only edit your own Lyric Back/)
  })
})
