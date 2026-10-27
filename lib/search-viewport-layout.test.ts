import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  landingHeroCenterFractionPx,
  landingHeroAnchorTopPx,
  searchDropdownMaxHeightBelowPx,
  searchFieldTopGoalPx,
} from './search-viewport-layout.ts'

test('search field top goal uses max(16px, 12% vv height) in visual band', () => {
  assert.equal(searchFieldTopGoalPx({ offsetTop: 0, viewportHeight: 360 }), Math.max(16, 360 * 0.12))
  assert.equal(searchFieldTopGoalPx({ offsetTop: 40, viewportHeight: 500 }), 40 + Math.max(16, 500 * 0.12))
  assert.equal(searchFieldTopGoalPx({ offsetTop: 0, viewportHeight: 100 }), 16)
})

test('dropdown max height fills visual viewport below anchor', () => {
  assert.equal(
    searchDropdownMaxHeightBelowPx({
      anchorBottom: 120,
      offsetTop: 0,
      viewportHeight: 360,
      gap: 8,
    }),
    232,
  )
})

test('landing hero anchor top shifts search to goal', () => {
  const top = landingHeroAnchorTopPx({
    shellTop: 0,
    anchorTop: 200,
    searchTop: 250,
    goalSearchTop: 100,
  })
  assert.equal(top, 50)
})

test('idle hero center fraction is 41%', () => {
  assert.equal(landingHeroCenterFractionPx(844), 844 * 0.41)
})

test('landing search active CSS keeps idle anchor at 41%', () => {
  const css = fs.readFileSync('app/globals.css', 'utf8')
  assert.match(css, /\.margo-landing-hero-anchor[\s\S]*top:\s*41%/)
  assert.match(css, /html\[data-margo-landing-search-active\][\s\S]*--margo-landing-hero-active-top/)
  assert.match(css, /html\[data-margo-landing-search-active\][\s\S]*\.margo-stage-hero__intro/)
})
