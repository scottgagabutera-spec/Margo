import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ARTIST_APPLICATION_MIN_LINKS,
  collectValidArtistLinks,
  validateArtistApplicationLinks,
} from './artist-application-links.ts'

test('collectValidArtistLinks requires https and dedupes', () => {
  const urls = collectValidArtistLinks({
    spotify: 'https://open.spotify.com/artist/1',
    apple: 'https://music.apple.com/us/album/x',
    dup: 'https://open.spotify.com/artist/1',
    bad: 'http://insecure.com',
  })
  assert.equal(urls.length, 2)
})

test('validateArtistApplicationLinks enforces minimum unless Suno verified', () => {
  const few = validateArtistApplicationLinks({
    links: { a: 'https://open.spotify.com/a' },
    sunoVerified: false,
  })
  assert.equal(few.ok, false)

  const three = validateArtistApplicationLinks({
    links: {
      a: 'https://open.spotify.com/a',
      b: 'https://music.apple.com/b',
      c: 'https://youtube.com/c',
    },
    sunoVerified: false,
  })
  assert.ok(three.ok)
  assert.equal(three.count, ARTIST_APPLICATION_MIN_LINKS)

  const sunoOnly = validateArtistApplicationLinks({
    links: { suno: 'https://suno.com/@x' },
    sunoVerified: true,
  })
  assert.ok(sunoOnly.ok)
})
