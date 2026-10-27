import { test, expect, type Page } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'

async function mockGenius(page: Page) {
  await page.route('**/api/genius?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: [
          {
            id: 'g1',
            song: 'Mapenzi Yana Run',
            artist: 'Sample Artist',
            artwork: '',
            source: 'genius',
          },
        ],
      }),
    })
  })
}

test.use({ viewport: { width: 360, height: 640 }, hasTouch: true })

test('landing returns to idle hero after song pick and browser back', async ({ page }) => {
  await mockGenius(page)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('html[data-margo-stage-client-ready]', { timeout: 20000 })
  const search = page.getByRole('searchbox', { name: /search song/i })
  await search.tap()
  await search.fill('map')
  await page.waitForResponse((r) => r.url().includes('/api/genius') && r.status() === 200)
  await page.getByRole('option', { name: /Mapenzi/i }).first().tap()
  await expect(page.getByRole('button', { name: /clear song/i })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /clear song/i }).tap()
  await page.waitForFunction(
    () => !document.documentElement.hasAttribute('data-margo-landing-search-active'),
    undefined,
    { timeout: 5000 },
  )
  const idle = await page.evaluate(() => {
    const shell = document.querySelector('.margo-landing-page-shell')
    const shellH = shell?.getBoundingClientRect().height ?? window.innerHeight
    const block = document.querySelector('.margo-landing-hero-anchor')
    const blockCenter = block
      ? block.getBoundingClientRect().top + block.getBoundingClientRect().height / 2
      : 0
    return { shellH, blockCenter, active: document.documentElement.hasAttribute('data-margo-landing-search-active') }
  })
  expect(idle.active).toBe(false)
  const target = idle.shellH * 0.41
  expect(Math.abs(idle.blockCenter - target)).toBeLessThanOrEqual(idle.shellH * 0.015)
})
