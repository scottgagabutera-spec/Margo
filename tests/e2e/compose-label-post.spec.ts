import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

test.describe('compose action labeled Post @834', () => {
  test.use({ viewport: { width: 834, height: 900 } })

  test('desktop gold pill text', async ({ page }) => {
    await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await expect(page.locator('.margo-desktop-nav a[href="/compose"]')).toHaveText(/Post/i)
  })

  test('130% zoom pill does not wrap', async ({ page }) => {
    await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.evaluate(() => { document.documentElement.style.fontSize = '130%' })
    await page.waitForTimeout(300)
    const pill = page.locator('.margo-desktop-nav a[href="/compose"]')
    await expect(pill).toBeVisible()
    const wraps = await pill.evaluate((el) => el.scrollWidth > el.clientWidth + 1)
    expect(wraps).toBe(false)
  })
})

test.describe('compose action labeled Post @390', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('mobile aria-label', async ({ page }) => {
    await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    const compose = page.locator('.margo-mobile-tabbar a[href="/compose"]')
    await expect(compose).toHaveAttribute('aria-label', 'Post')
  })
})
