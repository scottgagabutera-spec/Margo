import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

describe('PostReportMenu', () => {
  it('uses shared reasons and server report route', () => {
    const menu = fs.readFileSync('components/post-report-menu.tsx', 'utf8')
    assert.match(menu, /from '@\/lib\/post-report'/)
    assert.match(menu, /\/api\/posts\/report/)
    assert.doesNotMatch(menu, /\.from\('post_reports'\)\.insert/)
    assert.match(menu, /Report received\./)
    assert.match(menu, /role="radio"/)
    assert.match(menu, /margo-post-report-menu__sheet-submit/)
    assert.match(menu, /Reported/)
  })

  it('PostCard uses shared PostReportMenu with owner delete', () => {
    const card = fs.readFileSync('components/post-card.tsx', 'utf8')
    assert.match(card, /<PostReportMenu/)
    assert.match(card, /showOwnerDelete/)
  })

  it('LyricBackThreadRow shows report menu only for signed-in non-owners', () => {
    const row = fs.readFileSync('components/lyric-back-thread-row.tsx', 'utf8')
    assert.match(row, /showReportMenu/)
    assert.match(row, /PostReportMenu/)
    assert.match(row, /myId && !isOwner/)
    assert.doesNotMatch(row, /showOwnerDelete/)
  })
})

describe('posts/report API route', () => {
  it('validates session, rate limit, and email hook placeholder', () => {
    const route = fs.readFileSync('app/api/posts/report/route.ts', 'utf8')
    assert.match(route, /consumeHourlyApiRateLimit/)
    assert.match(route, /failOpenOnDbError: true/)
    assert.match(route, /parsePostReportBody/)
    assert.match(route, /author_profile_id === userId/)
    assert.match(route, /already_reported/)
    assert.match(route, /after\(/)
    assert.match(route, /runReportEmailJob/)
    assert.match(route, /reason_note/)
  })
})
