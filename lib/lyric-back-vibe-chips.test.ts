import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

describe('lyric-back vibe chips UI', () => {
  it('compose and edit include LyricBackVibeChips', () => {
    const compose = fs.readFileSync('components/lyric-back-panel-compose.tsx', 'utf8')
    const edit = fs.readFileSync('components/lyric-back-edit-sheet.tsx', 'utf8')
    assert.match(compose, /LyricBackVibeChips/)
    assert.match(edit, /LyricBackVibeChips/)
  })

  it('chips use the 17-option picker list', () => {
    const chips = fs.readFileSync('components/lyric-back-vibe-chips.tsx', 'utf8')
    assert.match(chips, /MOMENT_VIBE_PICKER_OPTIONS/)
    assert.match(chips, /margo-lb-vibe-chips__scroller/)
  })
})
