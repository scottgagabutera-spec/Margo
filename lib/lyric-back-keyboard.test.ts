import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  feedSearchScrollDelta,
  lyricBackPanelCapPx,
  panelSearchDropdownFrame,
  visualKeyboardInsetPx,
} from './lyric-back-keyboard.ts'

describe('lyric back keyboard geometry', () => {
  it('does not inflate the panel cap when the element top is negative', () => {
    const cap = lyricBackPanelCapPx({
      elementTop: -40,
      offsetTop: 0,
      viewportHeight: 400,
      bottomPad: 8,
    })
    assert.equal(cap, 392)
    assert.ok(cap <= 400)
  })

  it('caps to the visual viewport when the element sits above offsetTop', () => {
    const cap = lyricBackPanelCapPx({
      elementTop: 50,
      offsetTop: 200,
      viewportHeight: 300,
      bottomPad: 8,
    })
    assert.equal(cap, 292)
    assert.ok(cap <= 300)
  })

  it('allows a cap under 160px so a short visible band is not forced under the keyboard', () => {
    const cap = lyricBackPanelCapPx({
      elementTop: 360,
      offsetTop: 0,
      viewportHeight: 400,
      bottomPad: 8,
    })
    assert.equal(cap, 32)
  })

  it('measures one scroll delta that lands the search just under the nav', () => {
    assert.equal(feedSearchScrollDelta({ searchTop: 400, navHeight: 72 }), 316)
    assert.equal(feedSearchScrollDelta({ searchTop: 84, navHeight: 72 }), 0)
    assert.equal(
      feedSearchScrollDelta({ searchTop: 200, navHeight: 72, chromeBelowNav: 40, gap: 12 }),
      200 - 124,
    )
  })

  it('places the panel dropdown inside offsetTop + height without a 160px floor', () => {
    const frame = panelSearchDropdownFrame({
      anchorTop: 110,
      anchorBottom: 348,
      offsetTop: 100,
      viewportHeight: 300,
      bottomInset: 8,
    })
    const visibleBottom = 100 + 300
    assert.equal(frame.maxHeight, 38)
    assert.ok(frame.maxHeight < 160)
    assert.ok(frame.top >= 100)
    assert.ok(frame.top + frame.maxHeight <= visibleBottom)
  })

  it('keyboard inset never goes negative', () => {
    assert.equal(visualKeyboardInsetPx({
      innerHeight: 800,
      viewportHeight: 420,
      offsetTop: 0,
    }), 380)
    assert.equal(visualKeyboardInsetPx({
      innerHeight: 800,
      viewportHeight: 900,
      offsetTop: 0,
    }), 0)
  })
})

describe('lyric back keyboard wiring', () => {
  it('feed open path is one measured scroll and one preventScroll focus', () => {
    const panel = fs.readFileSync('components/lyric-back-focus-panel.tsx', 'utf8')
    const card = fs.readFileSync('components/post-card.tsx', 'utf8')
    const scroll = fs.readFileSync('lib/lyric-back-panel-scroll.ts', 'utf8')
    assert.match(panel, /scrollFeedLyricBackSearchUnderNav/)
    assert.match(panel, /focusSearch\(true\)/)
    assert.doesNotMatch(panel, /margo-post-card__lb-sticky-head/)
    assert.doesNotMatch(panel, /scrollIntoView/)
    assert.doesNotMatch(card, /scrollFeedLyricBackPanelIntoView/)
    assert.doesNotMatch(card, /scrollIntoView/)
    assert.doesNotMatch(scroll, /scrollFeedLyricBackPanelIntoView/)
    assert.match(scroll, /scrollFeedLyricBackSearchUnderNav/)
    assert.match(scroll, /pane\.scrollTop/)
  })

  it('viewport hook is resize-only and clears data-margo-keyboard', () => {
    const hook = fs.readFileSync('hooks/useLyricBackPanelViewport.ts', 'utf8')
    assert.match(hook, /addEventListener\('resize', update\)/)
    assert.doesNotMatch(hook, /addEventListener\('scroll'/)
    assert.doesNotMatch(hook, /\.scrollTop/)
    assert.doesNotMatch(hook, /Math\.max\(\s*160/)
    assert.match(hook, /removeAttribute\('data-margo-keyboard'\)/)
    assert.match(hook, /setAttribute\('data-margo-keyboard', '1'\)/)
    assert.match(hook, /pagehide/)
  })

  it('panel dropdown uses visualViewport offsetTop + height', () => {
    const dropdown = fs.readFileSync('components/compose-search-dropdown.tsx', 'utf8')
    assert.match(dropdown, /offsetTop: vv\?\.offsetTop/)
    assert.match(dropdown, /panelSearchDropdownFrame/)
    assert.doesNotMatch(dropdown, /Math\.max\(\s*160/)
    assert.doesNotMatch(dropdown, /window\.innerHeight - anchorRect/)
  })

  it('an open lyric back keeps the feed anchor on that post', () => {
    const shell = fs.readFileSync('components/primary-tab-shell.tsx', 'utf8')
    assert.match(shell, /margo-post-card__lb-panel/)
    assert.match(shell, /feed-post-/)
  })

  it('does not set interactive-widget=resizes-content', () => {
    const layout = fs.readFileSync('app/layout.tsx', 'utf8')
    const css = fs.readFileSync('app/globals.css', 'utf8')
    assert.doesNotMatch(layout, /interactive-widget|interactiveWidget/)
    assert.doesNotMatch(css, /(?<![\w-])height:\s*var\(--lb-panel-vvh/)
    assert.match(css, /height:\s*auto;/)
  })

  it('post page LB open is one window scroll and one preventScroll focus', () => {
    const postSection = fs.readFileSync('components/post-detail-lyric-section.tsx', 'utf8')
    const scroll = fs.readFileSync('lib/lyric-back-panel-scroll.ts', 'utf8')
    assert.match(postSection, /useLayoutEffect/)
    assert.match(postSection, /scrollPostLyricBackSearchUnderNav/)
    assert.match(postSection, /focusSearch\(true\)/)
    assert.match(postSection, /useLyricBackPanelViewport/)
    assert.match(postSection, /clearLyricBackKeyboardChrome/)
    assert.doesNotMatch(postSection, /scrollLbIntoView/)
    assert.doesNotMatch(postSection, /scrollIntoView[\s\S]*focusSearch\(\)/)
    assert.match(scroll, /scrollPostLyricBackSearchUnderNav/)
    assert.match(scroll, /window\.scrollBy/)
  })

  it('post panel compose does not auto-focus on mount', () => {
    const panel = fs.readFileSync('components/lyric-back-focus-panel.tsx', 'utf8')
    assert.match(panel, /focusSearchOnMount=\{false\}/)
  })
})
