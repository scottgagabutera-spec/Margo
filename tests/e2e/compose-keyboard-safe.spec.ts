import { test, expect, type Page } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'

async function mockGenius(page: Page) {
  await page.route('**/api/genius?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: [
          { id: 'g1', song: 'Seduce Me', artist: 'Alikiba', artwork: '', source: 'genius' },
        ],
      }),
    })
  })
}

test.use({ viewport: { width: 360, height: 640 }, hasTouch: true })

test('compose your-line sticky song row stays below header with keyboard', async ({ page }) => {
  await mockGenius(page)
  await page.goto(`${BASE}/compose`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  const search = page.getByRole('searchbox', { name: /search song/i })
  await search.tap()
  await search.fill('sed')
  await page.waitForResponse((r) => r.url().includes('/api/genius') && r.status() === 200)
  await page.getByRole('option', { name: /Seduce Me/i }).first().tap()
  await page.getByRole('button', { name: /continue/i }).tap({ timeout: 15000 }).catch(() => {})
  await expect(page.locator('.margo-compose-sticky-song')).toBeVisible({ timeout: 20000 })
  await page.setViewportSize({ width: 360, height: 406 })
  const field = page.locator('.margo-compose-overlay textarea, .margo-compose-overlay [contenteditable="true"]').first()
  await field.tap()
  await page.waitForTimeout(200)
  const box = await page.evaluate(() => {
    const nav = document.querySelector('.margo-nav-bar')
    const headerBottom = nav?.getBoundingClientRect().bottom ?? 72
    const chip = document.querySelector('.margo-compose-sticky-song')
    const clearBtn = document.querySelector('.margo-compose-sticky-song [aria-label="Clear song"]')
    const changeBtn = document.querySelector('.margo-compose-sticky-song [aria-label="Change song"]')
    const vv = window.visualViewport
    const visibleBottom = (vv?.offsetTop ?? 0) + (vv?.height ?? window.innerHeight)
    const chipRect = chip?.getBoundingClientRect()
    const clearRect = clearBtn?.getBoundingClientRect()
    const changeRect = changeBtn?.getBoundingClientRect()
    return { headerBottom, visibleBottom, chipRect, clearRect, changeRect }
  })
  expect(box.chipRect).toBeTruthy()
  expect(box.chipRect!.top).toBeGreaterThanOrEqual(box.headerBottom + 4 - 2)
  expect(box.chipRect!.bottom).toBeLessThanOrEqual(box.visibleBottom + 1)
  expect(box.clearRect!.width).toBeGreaterThanOrEqual(44)
  expect(box.changeRect!.width).toBeGreaterThanOrEqual(44)
})
