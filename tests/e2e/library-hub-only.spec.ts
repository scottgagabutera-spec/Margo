import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

for (const width of [834, 1180, 1440]) {
  test.describe(`library hub-only top bar @${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('no Library icon in MargoNav; Library tile in Hub', async ({ page }) => {
      await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(800)
      const libraryNav = page.locator('.margo-nav-bar a[aria-label="Music Library"]')
      await expect(libraryNav).toHaveCount(0)
      const hub = page.locator('.margo-nav-bar button[aria-label^="Hub"]').first()
      await expect(hub).toBeVisible({ timeout: 15000 })
      await hub.click({ force: true })
      await expect(page.getByRole('link', { name: /Music Library/i })).toBeVisible({ timeout: 10000 })
    })
  })
}

test('signed-out Hub Library goes to sign-in', async ({ page }) => {
  test.use({ viewport: { width: 834, height: 900 } })
  await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(600)
  const hub = page.locator('.margo-nav-bar button[aria-label^="Hub"]').first()
  await hub.click()
  const lib = page.getByRole('link', { name: /Music Library/i })
  await expect(lib).toBeVisible({ timeout: 10000 })
  await lib.click()
  expect(page.url()).toMatch(/signin|sign-in|auth/i)
})
