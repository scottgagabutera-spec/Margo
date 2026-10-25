import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { profileHrefForAuthor } from './profile-public-link.ts'

describe('profile-public-link', () => {
  it('returns href when author profile is loaded', () => {
    const href = profileHrefForAuthor(
      {
        id: 'x',
        username: 'kenzo',
        displayName: 'Kenzo',
        isArtist: false,
        artistStatus: null,
        avatarUrl: null,
      },
      'x',
    )
    assert.equal(href, '/profile/kenzo')
  })

  it('returns null without a profile row', () => {
    assert.equal(profileHrefForAuthor(null, 'missing-uid'), null)
  })
})
