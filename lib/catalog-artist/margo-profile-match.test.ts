import assert from 'node:assert/strict'
import test from 'node:test'
import { pickUniqueMargoArtistMatch } from '@/lib/catalog-artist/margo-profile-match'

test('pickUniqueMargoArtistMatch: single display_name hit', () => {
  const hit = pickUniqueMargoArtistMatch('Burna Boy', [
    { id: '1', username: 'burna', display_name: 'Burna Boy' },
    { id: '2', username: 'other', display_name: 'Other' },
  ])
  assert.equal(hit?.profileId, '1')
  assert.equal(hit?.username, 'burna')
})

test('pickUniqueMargoArtistMatch: username match', () => {
  const hit = pickUniqueMargoArtistMatch('taylorswift', [
    { id: '1', username: 'taylorswift', display_name: 'Taylor' },
  ])
  assert.equal(hit?.profileId, '1')
})

test('pickUniqueMargoArtistMatch: two matches → null', () => {
  const hit = pickUniqueMargoArtistMatch('Nova', [
    { id: '1', username: 'nova', display_name: 'Nova' },
    { id: '2', username: 'djnova', display_name: 'Nova' },
  ])
  assert.equal(hit, null)
})

test('pickUniqueMargoArtistMatch: no match', () => {
  const hit = pickUniqueMargoArtistMatch('Nobody', [
    { id: '1', username: 'a', display_name: 'Alice' },
  ])
  assert.equal(hit, null)
})
