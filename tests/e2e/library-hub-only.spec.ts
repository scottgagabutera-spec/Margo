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
      await page.locator('.margo-nav-bar button[aria-label^="Hub"]').click()
      await page.waitForTimeout(400)
      await expect(page.getByRole('link', { name: /Music Library/i })).toBeVisible()
    })
  })
}

test('signed-out Hub Library goes to sign-in', async ({ page }) => {
  test.use({ viewport: { width: 834, height: 900 } })
  await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(600)
  await page.locator('.margo-nav-bar button[aria-label^="Hub"]').click()
  await page.waitForTimeout(300)
  const lib = page.getByRole('link', { name: /Music Library/i })
  await lib.click()
  await page.waitForTimeout(500)
  expect(page.url()).toMatch(/signin|sign-in|auth/i)
})
