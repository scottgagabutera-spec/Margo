import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  auditShortsLookContrasts,
  contrastRatio,
  getShortsChromeTokens,
} from './shorts-chrome-tokens.ts'

describe('shorts chrome contrast', () => {
  it('gold still theme fails brand-gold-on-gold (legacy bug)', () => {
    const goldBg = '#E8C547'
    assert.ok(contrastRatio('#C9A227', goldBg) < 3)
  })

  it('gold still theme passes with chameleon tokens', () => {
    const tokens = getShortsChromeTokens('gold', 'still')
    assert.ok(contrastRatio(tokens.title, '#E8C547') >= 4.5)
    assert.ok(contrastRatio(tokens.icon, '#E8C547') >= 3)
  })

  it('every look in registry meets contrast floors', () => {
    const reports = auditShortsLookContrasts()
    assert.ok(reports.length >= 5)
    for (const row of reports) {
      assert.ok(
        row.titleRatio >= 4.5,
        `${row.lookKey} title ${row.titleRatio}`,
      )
      assert.ok(row.iconRatio >= 3, `${row.lookKey} icon ${row.iconRatio}`)
    }
  })
})
