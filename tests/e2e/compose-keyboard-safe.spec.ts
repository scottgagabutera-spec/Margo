import { test, expect, type Page } from '@playwright/test'
import {
  assertTappableInBand,
  installVisualViewportKeyboardMock,
  measureHeaderBottom,
  visibleBottomY,
  type KeyboardEmulationMode,
} from './helpers/visual-viewport-keyboard'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'

async function runComposeCase(page: Page, mode: KeyboardEmulationMode) {
  await installVisualViewportKeyboardMock(page, mode, 311)
  await page.setViewportSize({ width: 360, height: 717 })
  await page.goto(
    `${BASE}/compose?song=Betrayal&artist=Margo&lyric=Hello%20line`,
    { waitUntil: 'domcontentloaded', timeout: 60000 },
  )
  await expect(page.locator('[data-testid="compose-song-row"]')).toBeVisible({ timeout: 20000 })
  await page.evaluate(() => {
    const w = window as Window & { __margoVvMock?: { open: boolean } }
    if (w.__margoVvMock) w.__margoVvMock.open = true
    window.visualViewport?.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('resize'))
  })
  await page.waitForTimeout(200)
  const headerBottom = await measureHeaderBottom(page)
  const visBottom = await visibleBottomY(page)
  const hit = await assertTappableInBand(page, '[data-testid="compose-song-clear"]', headerBottom, visBottom)
  expect(hit.ok, hit.reason).toBeTruthy()
  await page.locator('[data-testid="compose-song-clear"]').tap()
  await expect(page.getByRole('searchbox', { name: /search song/i })).toBeVisible({ timeout: 10000 })
}

test.use({ hasTouch: true })

for (const mode of ['resizes-visual', 'resizes-content'] as KeyboardEmulationMode[]) {
  test(`compose song row tappable ${mode}`, async ({ page }) => {
    await runComposeCase(page, mode)
  })
}
