import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveBecomeArtistSettingsState } from './become-artist-settings-row.ts'

test('approved artist sees Open Studio', () => {
  const row = resolveBecomeArtistSettingsState({ isArtist: true, applicationStatus: null })
  assert.equal(row.kind, 'open_studio')
})

test('pending application is read-only copy', () => {
  const row = resolveBecomeArtistSettingsState({ isArtist: false, applicationStatus: 'pending' })
  assert.equal(row.kind, 'pending')
  assert.equal(row.label, 'Pending')
})

test('rejected application links to reapply', () => {
  const row = resolveBecomeArtistSettingsState({ isArtist: false, applicationStatus: 'rejected' })
  assert.equal(row.kind, 'not_approved')
  assert.equal(row.href, '/apply-artist')
})

test('not applied links to apply flow', () => {
  const row = resolveBecomeArtistSettingsState({ isArtist: false, applicationStatus: null })
  assert.equal(row.kind, 'apply')
  assert.equal(row.href, '/apply-artist')
})
