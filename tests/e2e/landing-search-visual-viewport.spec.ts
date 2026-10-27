import { test, expect, type Page } from '@playwright/test'
import {
  assertTappableInBand,
  installVisualViewportKeyboardMock,
  measureHeaderBottom,
  visibleBottomY,
  type KeyboardEmulationMode,
} from './helpers/visual-viewport-keyboard'

async function mockGenius(page: Page) {
  await page.route('**/api/genius?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: [
          { id: 'g1', song: 'Alikiba Song', artist: 'Alikiba', artwork: '', source: 'genius' },
          { id: 'g2', song: 'Beta Song', artist: 'Artist B', artwork: '', source: 'genius' },
          { id: 'g3', song: 'Gamma Song', artist: 'Artist C', artwork: '', source: 'genius' },
        ],
      }),
    })
  })
}

async function openLandingSearchKeyboard(page: Page) {
  await page.evaluate(() => {
    const w = window as Window & { __margoVvMock?: { open: boolean } }
    if (w.__margoVvMock) w.__margoVvMock.open = true
    window.visualViewport?.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('resize'))
  })
  await page.waitForFunction(() => {
    const searchTop =
      document.querySelector('.margo-stage-hero:not(.margo-stage-hero--ssr) .margo-search-wrap--standard')
        ?.getBoundingClientRect().top ?? 0
    const headerBottom = document.querySelector('.margo-landing-nav')?.getBoundingClientRect().bottom ?? 0
    return searchTop >= headerBottom + 8 - 2
  }, undefined, { timeout: 10000 })
}

async function runLandingKeyboardCase(
  page: Page,
  width: number,
  fullHeight: number,
  keyboardPx: number,
  mode: KeyboardEmulationMode,
) {
  await installVisualViewportKeyboardMock(page, mode, keyboardPx)
  await page.setViewportSize({ width, height: fullHeight })
  await mockGenius(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('html[data-margo-stage-client-ready]')
  const search = page.getByRole('searchbox', { name: /search song/i })
  await search.tap()
  await search.fill('Alikiba')
  await page.waitForResponse((r) => r.url().includes('/api/genius') && r.status() === 200)
  await openLandingSearchKeyboard(page)

  const headerBottom = await measureHeaderBottom(page)
  const visBottom = await visibleBottomY(page)
  const metrics = await page.evaluate(() => {
    const mock = (window as Window & { __margoVvMock?: { open: boolean; fullH: number; keyboardH: number } }).__margoVvMock
    const keyboardTop = mock?.open ? mock.fullH - mock.keyboardH : window.innerHeight
    return {
      innerHeight: window.innerHeight,
      keyboardTop,
      shift: getComputedStyle(document.documentElement).getPropertyValue('--margo-landing-hero-shift').trim(),
      searchTop:
        document.querySelector('.margo-stage-hero:not(.margo-stage-hero--ssr) .margo-search-wrap--standard')
          ?.getBoundingClientRect().top ?? 0,
    }
  })

  if (mode === 'resizes-visual') {
    expect(metrics.innerHeight).toBe(fullHeight)
  }
  expect(metrics.keyboardTop).toBeLessThan(fullHeight)
  expect(parseFloat(metrics.shift || '0')).toBeGreaterThan(0)
  expect(metrics.searchTop).toBeGreaterThanOrEqual(headerBottom + 8 - 2)

  const row0 = '.compose-search-row--stage'
  await expect(page.locator(row0).nth(0)).toBeVisible()
  const hit0 = await assertTappableInBand(page, row0, headerBottom, visBottom, 0)
  expect(hit0.ok, hit0.reason).toBeTruthy()
  const hit1 = await assertTappableInBand(page, row0, headerBottom, visBottom, 1)
  expect(hit1.ok, hit1.reason).toBeTruthy()
}

const modes: KeyboardEmulationMode[] = ['resizes-visual', 'resizes-content']

test.use({ hasTouch: true })

for (const mode of modes) {
  test(`landing search vv keyboard ${mode} @360x717`, async ({ page }) => {
    await runLandingKeyboardCase(page, 360, 717, 311, mode)
  })
  test(`landing search vv keyboard ${mode} @390x844`, async ({ page }) => {
    await runLandingKeyboardCase(page, 390, 844, 380, mode)
  })
}
