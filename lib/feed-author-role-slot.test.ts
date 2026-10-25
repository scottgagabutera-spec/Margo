import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

describe('feed author role slot (empty)', () => {
  it('slot is zero-width in CSS and renders no children in AuthorMeta', () => {
    const css = fs.readFileSync('app/globals.css', 'utf8')
    assert.match(css, /\.margo-feed-author-role-slot\s*\{[^}]*width:\s*0/)
    const tag = fs.readFileSync('components/username-tag.tsx', 'utf8')
    assert.match(tag, /margo-feed-author-role-slot/)
    assert.match(tag, /Future: 18px round role badge/)
  })
})
