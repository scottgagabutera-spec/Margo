import { test, expect, type Page } from '@playwright/test'
import {
  assertTappableInBand,
  installVisualViewportKeyboardMock,
  measureHeaderBottom,
  visibleBottomY,
  type KeyboardEmulationMode,
} from './helpers/visual-viewport-keyboard'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'

async function mockGenius(page: Page) {
  await page.route('**/api/genius?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: [{ id: 'g1', song: 'Betrayal', artist: 'Margo', artwork: '', source: 'genius' }],
      }),
    })
  })
}

async function runComposeCase(page: Page, mode: KeyboardEmulationMode) {
  await page.setViewportSize({ width: 360, height: 717 })
  await installVisualViewportKeyboardMock(page, mode, 311)
  await mockGenius(page)
  await page.goto(`${BASE}/compose`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  const search = page.getByRole('searchbox', { name: /search song/i })
  await search.tap()
  await search.fill('bet')
  await page.waitForResponse((r) => r.url().includes('/api/genius') && r.status() === 200)
  await page.getByRole('option', { name: /Betrayal/i }).first().tap()
  await page.getByRole('button', { name: /^continue$/i }).tap({ timeout: 15000 })
  await expect(page.locator('[data-testid="compose-song-row"]')).toBeVisible({ timeout: 20000 })
  const field = page.locator('.margo-compose-region__scroll textarea, .margo-compose-region__scroll [contenteditable="true"]').first()
  await field.tap()
  await page.waitForTimeout(350)
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
