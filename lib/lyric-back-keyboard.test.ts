import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  feedSearchScrollDelta,
  lyricBackPanelCapPx,
  panelSearchDropdownFrame,
  visualKeyboardInsetPx,
} from './lyric-back-keyboard.ts'
import {
  LYRIC_BACK_DEPTH_CAP,
  lyricBackCanReply,
  lyricBackDepth,
  lyricBackVisualStep,
  reduceLyricBackStack,
} from './lyric-back-depth.ts'

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

describe('lyric back depth', () => {
  it('caps replies at 8 and visual indent at 3', () => {
    assert.equal(LYRIC_BACK_DEPTH_CAP, 8)
    assert.equal(lyricBackDepth(0, 0), 0)
    assert.equal(lyricBackDepth(1, 7), 8)
    assert.equal(lyricBackCanReply(7), true)
    assert.equal(lyricBackCanReply(8), false)
    assert.equal(lyricBackVisualStep(0), 0)
    assert.equal(lyricBackVisualStep(1), 1)
    assert.equal(lyricBackVisualStep(2), 2)
    assert.equal(lyricBackVisualStep(6), 3)
  })

  it('walks A > B > C > D and back one level at a time', () => {
    const level = (id: string) => ({ id })
    const ids = (stack: readonly { id: string }[]) => stack.map((row) => row.id)
    let stack: { id: string }[] = []

    assert.deepEqual(ids(stack), [])

    stack = reduceLyricBackStack(stack, { type: 'drill', echo: level('B') })
    assert.deepEqual(ids(stack), ['B'])

    stack = reduceLyricBackStack(stack, { type: 'drill', echo: level('C') })
    assert.deepEqual(ids(stack), ['B', 'C'])

    stack = reduceLyricBackStack(stack, { type: 'drill', echo: level('D') })
    assert.deepEqual(ids(stack), ['B', 'C', 'D'])

    stack = reduceLyricBackStack(stack, { type: 'back' })
    assert.deepEqual(ids(stack), ['B', 'C'])
    assert.equal(stack.length, 2)

    stack = reduceLyricBackStack(stack, { type: 'back' })
    assert.deepEqual(ids(stack), ['B'])
    assert.equal(stack.length, 1)

    stack = reduceLyricBackStack(stack, { type: 'back' })
    assert.deepEqual(ids(stack), [])
    assert.equal(stack.length, 0)

    const atRoot = stack
    assert.equal(reduceLyricBackStack(atRoot, { type: 'back' }), atRoot)

    let nested = [level('B'), level('C'), level('D')]
    nested = reduceLyricBackStack(nested, { type: 'truncate', depth: 2 })
    assert.deepEqual(ids(nested), ['B', 'C'])
    nested = reduceLyricBackStack(nested, { type: 'truncate', depth: 1 })
    assert.deepEqual(ids(nested), ['B'])
    nested = reduceLyricBackStack(nested, { type: 'truncate', depth: 0 })
    assert.deepEqual(ids(nested), [])
    assert.equal(
      reduceLyricBackStack([level('B'), level('C'), level('D')], { type: 'drill', echo: level('D') }).length,
      3,
    )

    const hook = fs.readFileSync('hooks/useLyricBackFocusStack.ts', 'utf8')
    const panel = fs.readFileSync('components/lyric-back-focus-panel.tsx', 'utf8')
    const post = fs.readFileSync('app/post/[id]/page.tsx', 'utf8')
    const postSection = fs.readFileSync('components/post-detail-lyric-section.tsx', 'utf8')
    assert.match(hook, /reduceLyricBackStack/)
    assert.match(hook, /history\.back\(\)/)
    assert.match(hook, /if \(backGuardRef\.current\) return/)
    assert.doesNotMatch(hook, /useEchoes\(/)
    assert.match(panel, /requestBack/)
    assert.match(panel, /echoesReady/)
    assert.doesNotMatch(panel, /backOneLevel/)
    assert.match(post, /requestBack/)
    assert.match(post, /collapseToRoot/)
    assert.doesNotMatch(post, /backOneLevel/)
    assert.match(hook, /navDirectionRef/)
    assert.doesNotMatch(postSection, /focusSearch/)
  })

  it('hides the Lyric Back action at the cap and labels the control Back', () => {
    const stack = fs.readFileSync('hooks/useLyricBackFocusStack.ts', 'utf8')
    const panel = fs.readFileSync('components/lyric-back-focus-panel.tsx', 'utf8')
    const post = fs.readFileSync('app/post/[id]/page.tsx', 'utf8')
    assert.match(stack, /lyricBackCanReply/)
    assert.match(panel, />\s*Back\s*</)
    assert.doesNotMatch(panel, /Back to @/)
    assert.match(panel, /hideLyricBackAction=\{!canReply\}/)
    assert.match(post, /lyricBackCanReply\(depthOffset\)/)
    assert.doesNotMatch(post, /hideLyricBackAction\s*\n/)
  })
})

describe('lyric back keyboard wiring', () => {
  it('feed open path leaves search unfocused until the user taps it', () => {
    const panel = fs.readFileSync('components/lyric-back-focus-panel.tsx', 'utf8')
    const card = fs.readFileSync('components/post-card.tsx', 'utf8')
    const scroll = fs.readFileSync('lib/lyric-back-panel-scroll.ts', 'utf8')
    const css = fs.readFileSync('app/globals.css', 'utf8')
    assert.doesNotMatch(panel, /scrollFeedLyricBackSearchUnderNav/)
    assert.doesNotMatch(panel, /scrollIntoView/)
    assert.doesNotMatch(panel, /margo-post-card__lb-sticky-head/)
    assert.equal(panel.split('focusSearch(true)').length - 1, 1)
    assert.match(panel, /activeElement === field/)
    assert.match(panel, /field\.blur\(\)/)
    assert.doesNotMatch(card, /scrollFeedLyricBackPanelIntoView/)
    assert.doesNotMatch(card, /scrollIntoView/)
    assert.doesNotMatch(scroll, /scrollFeedLyricBackPanelIntoView/)
    assert.doesNotMatch(scroll, /scrollFeedLyricBackSearchUnderNav/)
    assert.doesNotMatch(scroll, /pane\.scrollTop/)
    assert.match(css, /\.margo-lb-focus__scroll \{[^}]*touch-action:\s*pan-y/)
    assert.match(css, /margo-lb-focus__bar--nested/)
    assert.match(
      fs.readFileSync('hooks/usePrimaryTabSwipeGesture.ts', 'utf8'),
      /\.margo-post-card__lb-panel/,
    )
    assert.doesNotMatch(css, /margo-lb-thread-row--step-1 \{ margin-left: 12px/)
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

  it('post page lyric back does not focus search or scroll it under the nav', () => {
    const postSection = fs.readFileSync('components/post-detail-lyric-section.tsx', 'utf8')
    const scroll = fs.readFileSync('lib/lyric-back-panel-scroll.ts', 'utf8')
    const panel = fs.readFileSync('components/lyric-back-focus-panel.tsx', 'utf8')
    assert.doesNotMatch(postSection, /scrollPostLyricBackSearchUnderNav/)
    assert.doesNotMatch(postSection, /focusSearch/)
    assert.match(postSection, /useLyricBackPanelViewport/)
    assert.match(postSection, /clearLyricBackKeyboardChrome/)
    assert.doesNotMatch(postSection, /scrollLbIntoView/)
    assert.doesNotMatch(postSection, /scrollIntoView[\s\S]*focusSearch/)
    assert.doesNotMatch(scroll, /scrollPostLyricBackSearchUnderNav/)
    assert.doesNotMatch(scroll, /window\.scrollBy/)
    assert.match(panel, /activeElement === field/)
  })

  it('post panel compose does not auto-focus on mount', () => {
    const panel = fs.readFileSync('components/lyric-back-focus-panel.tsx', 'utf8')
    assert.match(panel, /focusSearchOnMount=\{false\}/)
  })
})
