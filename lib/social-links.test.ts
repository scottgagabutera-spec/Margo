import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MARGO_SOCIAL_LINKS,
  margoFooterSocialHrefs,
  margoSchemaSameAs,
} from './social-links.ts'

test('footer social list has six accounts in display order', () => {
  assert.equal(MARGO_SOCIAL_LINKS.length, 6)
  assert.deepEqual(
    MARGO_SOCIAL_LINKS.map((l) => l.id),
    ['instagram', 'facebook', 'tiktok', 'x', 'youtube', 'spotify'],
  )
})

test('schema sameAs matches footer social URLs', () => {
  const sameAs = margoSchemaSameAs()
  assert.deepEqual(sameAs, margoFooterSocialHrefs())
  assert.ok(sameAs.includes('https://www.facebook.com/share/1CiYZanmmg/'))
})
