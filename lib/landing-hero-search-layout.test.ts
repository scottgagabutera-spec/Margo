import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  landingHeroSearchWidthPx,
  STAGE_SEARCH_ROW_THUMB_PX,
  STAGE_SEARCH_ROW_TITLE_FONT_PX,
} from './landing-hero-search-layout.ts'

test('landing hero search width formula', () => {
  assert.equal(landingHeroSearchWidthPx(360), 312)
  assert.equal(landingHeroSearchWidthPx(390), 342)
  assert.equal(landingHeroSearchWidthPx(1280), 480)
})

test('stage zone stretches search to full column width', () => {
  const css = fs.readFileSync('app/globals.css', 'utf8')
  assert.match(css, /\.margo-stage-zone[\s\S]*align-items:\s*stretch/)
  assert.match(css, /\.margo-stage-hero-search[\s\S]*width:\s*100%/)
  assert.doesNotMatch(css, /\.margo-stage-hero-search[\s\S]*calc\(100%\s*-\s*48px\)/)
})

test('footer UI uses Geist token via --margo-footer-ui-font', () => {
  const css = fs.readFileSync('app/globals.css', 'utf8')
  assert.match(css, /--margo-footer-ui-font:\s*var\(--font-geist-sans\)/)
  assert.match(css, /\.margo-footer__more-chip[\s\S]*var\(--margo-footer-ui-font\)/)
})

test('stage search row metrics match main dropdown', () => {
  const dropdown = fs.readFileSync('components/compose-search-dropdown.tsx', 'utf8')
  assert.match(dropdown, /isStage \? '44px' : '48px'/)
  assert.match(dropdown, /fontSize: isStage \? '0\.9rem' : '0\.95rem'/)
  assert.equal(STAGE_SEARCH_ROW_THUMB_PX, 44)
  assert.equal(STAGE_SEARCH_ROW_TITLE_FONT_PX, 14.4)
})
