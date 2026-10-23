import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

describe('PostReportMenu', () => {
  it('exports the same report reasons as the legacy PostCard list', () => {
    const menu = fs.readFileSync('components/post-report-menu.tsx', 'utf8')
    assert.match(menu, /POST_REPORT_REASONS = \['Spam', 'Harassment', 'Inappropriate', 'Other'\]/)
    assert.match(menu, /post_reports/)
    assert.match(menu, /createPortal/)
    assert.match(menu, /MargoSheet/)
    assert.match(menu, /Report received\./)
    assert.doesNotMatch(menu, /margo-post-report-menu__panel/)
  })

  it('PostCard uses shared PostReportMenu with owner delete', () => {
    const card = fs.readFileSync('components/post-card.tsx', 'utf8')
    assert.match(card, /<PostReportMenu/)
    assert.match(card, /showOwnerDelete/)
    assert.doesNotMatch(card, /REPORT_REASONS/)
  })

  it('LyricBackThreadRow shows report menu only for signed-in non-owners', () => {
    const row = fs.readFileSync('components/lyric-back-thread-row.tsx', 'utf8')
    assert.match(row, /showReportMenu/)
    assert.match(row, /PostReportMenu/)
    assert.match(row, /myId && !isOwner/)
    assert.doesNotMatch(row, /showOwnerDelete/)
  })
})
