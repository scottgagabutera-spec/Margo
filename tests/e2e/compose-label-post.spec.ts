import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

test.describe('compose action labeled Post', () => {
  test('desktop gold pill @834', async ({ page }) => {
    test.use({ viewport: { width: 834, height: 900 } })
    await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await expect(page.locator('.margo-desktop-nav a[href="/compose"]')).toHaveText(/Post/i)
  })

  test('mobile compose control @390', async ({ page }) => {
    test.use({ viewport: { width: 390, height: 844 } })
    await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    const compose = page.locator('.margo-mobile-tabbar a[href="/compose"]')
    await expect(compose).toHaveAttribute('aria-label', 'Post')
  })

  test('130% zoom keeps one line on pill @390', async ({ page }) => {
    test.use({ viewport: { width: 390, height: 844 } })
    await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '130%'
    })
    await page.waitForTimeout(300)
    const pill = page.locator('.margo-desktop-nav a[href="/compose"]')
    if (await pill.isVisible()) {
      const wraps = await pill.evaluate((el) => el.scrollWidth > el.clientWidth + 1)
      expect(wraps).toBe(false)
    }
  })
})
