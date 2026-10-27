import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('landing page shell is viewport locked without stage-footer-gap scroll', () => {
  const css = fs.readFileSync('app/globals.css', 'utf8')
  assert.match(css, /\.margo-landing-page-shell[\s\S]*height:\s*100dvh/)
  assert.match(css, /\.margo-landing-page-shell[\s\S]*overflow:\s*hidden/)
  assert.doesNotMatch(css, /--stage-footer-gap/)
  assert.doesNotMatch(css, /min-height:\s*calc\(100dvh - 64px/)
})

test('hero anchor vertical center at 41%', () => {
  const css = fs.readFileSync('app/globals.css', 'utf8')
  assert.match(css, /\.margo-landing-hero-anchor[\s\S]*top:\s*41%/)
  assert.match(css, /\.margo-landing-hero-anchor[\s\S]*translateY\(-50%\)/)
})

test('Stage landing SSR hero ships wordmark and search for first paint', () => {
  const src = fs.readFileSync('components/stage/stage-landing-ssr-hero.tsx', 'utf8')
  assert.match(src, />MARGO</)
  assert.match(src, /Expression through a line of music/)
  assert.match(src, /type="search"/)
  const page = fs.readFileSync('components/stage/stage-landing-page.tsx', 'utf8')
  assert.doesNotMatch(page, /use client/)
  assert.match(page, /StageLandingSsrHero/)
})

test('signed-in landing header uses You link when identity present', () => {
  const src = fs.readFileSync('components/stage/landing-account-nav.tsx', 'utf8')
  assert.match(src, /isSignedIn \?/)
  assert.match(src, /<span>You<\/span>/)
  assert.match(src, /SignInLink/)
})

test('footer link data includes sheet URLs', () => {
  const src = fs.readFileSync('components/footer/margo-footer-links.ts', 'utf8')
  for (const href of ['/about', '/help', '/contact', '/privacy', '/terms', '/dmca', '/data-deletion']) {
    assert.ok(src.includes(`'${href}'`), href)
  }
  assert.ok(src.includes('Help Center'))
  assert.ok(src.includes('Data deletion'))
})

test('layout schema uses shared social config', () => {
  const src = fs.readFileSync('app/layout.tsx', 'utf8')
  assert.match(src, /margoSchemaSameAs\(\)/)
})
