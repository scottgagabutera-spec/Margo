import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'

function isTabGoldColor(color: string): boolean {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) return false
  return Number(m[1]) >= 210 && Number(m[2]) >= 175 && Number(m[3]) >= 40 && Number(m[3]) <= 110
}

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

test('signin → hub → signin → feed: Feed tab gold before /feed URL', async ({ page }) => {
  await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.getByRole('button', { name: /^Hub/i }).tap()
  await page.locator('.margo-mobile-tabbar a[href*="/signin"]').tap()
  await expect(page).toHaveURL(/\/signin/)

  await page.getByRole('button', { name: /^Hub/i }).tap()
  await page.locator('#margo-hub-sign-in').click()
  await expect(page).toHaveURL(/\/signin/)

  await page.getByRole('button', { name: /^Hub/i }).tap()
  await expect(page.getByRole('dialog', { name: 'Hub' })).toBeVisible()

  const feedLink = page.locator('.margo-mobile-tabbar a[href="/feed"]')
  await feedLink.tap()
  await expect(page.getByRole('dialog', { name: 'Hub' })).toHaveCount(0, { timeout: 3000 })

  await expect
    .poll(async () => {
      const feedColor = await page.locator('.margo-mobile-tabbar a[href="/feed"] span').last().evaluate((el) => getComputedStyle(el).color)
      return isTabGoldColor(feedColor)
    }, { timeout: 3000 })
    .toBe(true)

  await expect(page).toHaveURL(/\/feed/, { timeout: 15000 })
  await expect(
    page.locator('[data-margo-primary-tab="feed"][data-margo-primary-tab-shown="1"], [data-margo-primary-tab-skeleton="feed"]'),
  ).toBeVisible({ timeout: 10000 })
})
