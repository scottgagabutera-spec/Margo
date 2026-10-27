import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'

test.describe('signin hub tab navigation @390', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('from /signin Hub opens overlay and Sign In tab is not active', async ({ page }) => {
    await page.goto(`${BASE}/signin?returnTo=%2Ffeed`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.locator('.margo-mobile-tabbar')).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: /^Hub/i }).click()
    await expect(page.getByRole('dialog', { name: 'Hub' })).toBeVisible()
    await expect(page.locator('.margo-mobile-tabbar a[href*="/signin"]')).not.toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('button', { name: /^Hub/i })).toHaveAttribute('aria-expanded', 'true')
  })

  test('Feed to Sign In to Back returns to Feed', async ({ page }) => {
    await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.locator('.margo-mobile-tabbar a[href*="/signin"]').click()
    await expect(page).toHaveURL(/\/signin/)
    await page.goBack()
    await expect(page).toHaveURL(/\/feed/)
  })

  test('Discover to Sign In to Back returns to Discover', async ({ page }) => {
    await page.goto(`${BASE}/discover`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.locator('.margo-mobile-tabbar a[href*="/signin"]').click()
    await expect(page).toHaveURL(/\/signin/)
    await page.goBack()
    await expect(page).toHaveURL(/\/discover/)
  })

  test('Hub to Sign In to Hub via Back', async ({ page }) => {
    await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.getByRole('button', { name: /^Hub/i }).click()
    await expect(page.getByRole('dialog', { name: 'Hub' })).toBeVisible()
    await page.locator('#margo-hub-sign-in').click()
    await expect(page).toHaveURL(/\/signin/)
    await page.goBack()
    await expect(page).toHaveURL(/\/feed/)
    await expect
      .poll(async () => page.getByRole('dialog', { name: 'Hub' }).isVisible())
      .toBe(true)
  })

  test('Hub locked tile still opens sign-in with returnTo', async ({ page }) => {
    await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.getByRole('button', { name: /^Hub/i }).click()
    await page.getByRole('button', { name: /Sign in required/i }).first().click()
    await expect(page).toHaveURL(/\/signin\?.*returnTo=/)
  })
})
