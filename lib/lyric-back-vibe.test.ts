import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  MARGO_VIBE_KEYS,
  isMargoVibeKey,
  resolveLyricBackStoredEmotion,
} from './moment/vibe.ts'

describe('lyric-back vibe validation', () => {
  it('exposes 17 canonical keys', () => {
    assert.equal(MARGO_VIBE_KEYS.length, 17)
    assert.ok(MARGO_VIBE_KEYS.includes('chill'))
    assert.ok(MARGO_VIBE_KEYS.includes('sendit'))
  })

  it('rejects unknown vibes', () => {
    assert.equal(isMargoVibeKey('party'), false)
    assert.equal(isMargoVibeKey(''), false)
  })

  it('defaults to parent vibe when request omits emotion', () => {
    const r = resolveLyricBackStoredEmotion(undefined, 'GRATEFUL')
    assert.equal(r.ok, true)
    if (r.ok) assert.equal(r.emotion, 'GRATEFUL')
  })

  it('accepts valid requested vibe', () => {
    const r = resolveLyricBackStoredEmotion('Send It', 'chill')
    assert.equal(r.ok, true)
    if (r.ok) assert.equal(r.emotion, 'SENDIT')
  })

  it('rejects invalid requested vibe', () => {
    const r = resolveLyricBackStoredEmotion('not-a-vibe', 'hope')
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.reason, 'invalid_vibe')
  })
})

describe('posts/lyric-back route vibe wiring', () => {
  it('uses resolveLyricBackStoredEmotion on the server route', () => {
    const route = fs.readFileSync('app/api/posts/lyric-back/route.ts', 'utf8')
    assert.match(route, /resolveLyricBackStoredEmotion/)
  })
})
