import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

describe('DeleteMomentDialog', () => {
  it('portals to document.body so dialog is not trapped in PostCard stacking context', () => {
    const src = fs.readFileSync('components/delete-moment-dialog.tsx', 'utf8')
    assert.match(src, /createPortal/)
    assert.match(src, /document\.body/)
  })

  it('uses short shared delete copy for moment and lyric-back', () => {
    const src = fs.readFileSync('components/delete-moment-dialog.tsx', 'utf8')
    assert.match(src, /This can\\u2019t be undone\./)
    assert.doesNotMatch(src, /removed from Feed/)
    assert.doesNotMatch(src, /stay as a shell/)
  })
})
