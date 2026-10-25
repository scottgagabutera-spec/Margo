import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseAppleTrackCredit } from './apple-track-credit.ts'

describe('parseAppleTrackCredit', () => {
  it('splits paren feat into title and artist credit', () => {
    const r = parseAppleTrackCredit(
      'Eu Não Quero Saber (feat. Nagrelha & Rei)',
      'JD Music Surabaya',
    )
    assert.equal(r.title, 'Eu Não Quero Saber')
    assert.equal(r.artist, 'JD Music Surabaya feat. Nagrelha & Rei')
  })

  it('passes through plain tracks', () => {
    const r = parseAppleTrackCredit('MAPA', 'SB19')
    assert.equal(r.title, 'MAPA')
    assert.equal(r.artist, 'SB19')
  })
})
