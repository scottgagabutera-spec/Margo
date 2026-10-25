import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

describe('profile portrait role slots (empty)', () => {
  it('third-line and role slots are zero-size in CSS', () => {
    const css = fs.readFileSync('app/globals.css', 'utf8')
    assert.match(css, /\.margo-profile-role-third-slot:empty[\s\S]*?width:\s*0/)
    assert.match(css, /\.margo-feed-role-third-slot:empty[\s\S]*?width:\s*0/)
    assert.match(css, /\.margo-feed-author-role-slot\s*\{[^}]*width:\s*0/)
    const identity = fs.readFileSync('components/profile-portrait-identity.tsx', 'utf8')
    assert.match(identity, /profile-author-role-slot/)
    assert.match(identity, /profile-role-third-slot/)
    assert.match(identity, /MargoPortraitAvatar/)
  })
})
