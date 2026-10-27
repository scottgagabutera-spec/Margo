import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MARGO_SOCIAL_LINKS,
  MARGO_FACEBOOK_SAME_AS,
  margoFooterSocialHrefs,
  margoSchemaSameAs,
} from './social-links.ts'

test('footer social list has five accounts in display order', () => {
  assert.equal(MARGO_SOCIAL_LINKS.length, 5)
  assert.deepEqual(
    MARGO_SOCIAL_LINKS.map((l) => l.id),
    ['instagram', 'tiktok', 'x', 'youtube', 'spotify'],
  )
})

test('schema sameAs keeps Facebook and includes footer URLs', () => {
  const sameAs = margoSchemaSameAs()
  assert.ok(sameAs.includes(MARGO_FACEBOOK_SAME_AS))
  for (const href of margoFooterSocialHrefs()) {
    assert.ok(sameAs.includes(href))
  }
})
