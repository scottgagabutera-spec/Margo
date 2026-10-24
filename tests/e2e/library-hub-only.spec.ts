import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

async function clickDesktopHub(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const el = document.querySelector(
      '[data-margo-hub-desktop-anchor="1"]',
    ) as HTMLElement | null
    el?.click()
  })
}

for (const width of [834, 1180, 1440]) {
  test.describe(`library hub-only top bar @${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('no Library icon in MargoNav; Library tile in Hub', async ({ page }) => {
      await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(800)
      const libraryNav = page.locator('.margo-nav-bar a[aria-label="Music Library"]')
      await expect(libraryNav).toHaveCount(0)
      const hub = page.locator('[data-margo-hub-desktop-anchor="1"]')
      await expect(hub).toBeVisible({ timeout: 15000 })
      await clickDesktopHub(page)
      const panel = page.locator('.margo-hub-panel')
      await expect(panel).toBeVisible({ timeout: 10000 })
      await expect(panel.getByRole('link', { name: /Music Library/i })).toBeVisible({
        timeout: 10000,
      })
    })
  })
}

test.describe('signed-out library via Hub', () => {
  test.use({ viewport: { width: 834, height: 900 } })

  test('Hub Library goes to sign-in', async ({ page }) => {
  await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(600)
  await clickDesktopHub(page)
  const panel = page.locator('.margo-hub-panel')
  const lib = panel.getByRole('link', { name: /Music Library/i })
  await expect(lib).toBeVisible({ timeout: 10000 })
  await expect(lib).toHaveAttribute('href', /signin/i)
  await lib.evaluate((el: HTMLAnchorElement) => el.click())
  await page.waitForURL(/signin/i, { timeout: 15000 })
  })
})
