import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

describe('Lyric Back edit search parity', () => {
  it('root cause: panel search dropdown z-index below removed full-screen edit layer', () => {
    const dropdown = fs.readFileSync('components/compose-search-dropdown.tsx', 'utf8')
    assert.match(dropdown, /PANEL_SCRIM_Z = 240/)
    assert.match(dropdown, /PANEL_LIST_Z = 241/)
    assert.doesNotMatch(
      fs.readFileSync('components/lyric-back-thread-row.tsx', 'utf8'),
      /zIndex:\s*245/,
    )
  })

  it('edit uses the same LyricBackPanelCompose search path as the panel', () => {
    const compose = fs.readFileSync('components/lyric-back-panel-compose.tsx', 'utf8')
    const row = fs.readFileSync('components/lyric-back-thread-row.tsx', 'utf8')
    assert.match(compose, /fetchUnifiedSongSearchHits\(supabase, q, 10\)/)
    assert.match(row, /LyricBackPanelCompose/)
    assert.match(row, /layout="panel"/)
    assert.match(row, /mode="edit"/)
    assert.doesNotMatch(row, /LyricBackEditLayer/)
  })
})
