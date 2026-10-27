import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

const PHONE_VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
] as const

async function openHub(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.locator('.margo-mobile-tabbar button[aria-label^="Hub"]').click({ timeout: 10000 })
  await expect(page.locator('.margo-hub-sheet')).toBeVisible({ timeout: 10000 })
}

for (const vp of PHONE_VIEWPORTS) {
  test.describe(`search-signin signed-out @${vp.width}x${vp.height}`, () => {
    test.use({ viewport: vp })

    test('Hub Sign in keeps tab bar; sign-in page paints without losing chrome', async ({ page }) => {
      await openHub(page)
      await page.locator('#margo-hub-sign-in').click()
      await expect(page).toHaveURL(/\/signin/, { timeout: 15000 })
      await expect(page.locator('.margo-mobile-tabbar')).toBeVisible()
      await expect(page.locator('input[type="email"], input[type="password"]').first()).toBeVisible({ timeout: 15000 })
      await expect(page.locator('.margo-auth-layout__main')).toBeVisible()
    })

    test('Hub locked tile navigates to sign-in with returnTo', async ({ page }) => {
      await openHub(page)
      await page.locator('[data-hub-tile="library"]').click()
      await expect(page).toHaveURL(/\/signin\?.*returnTo=/, { timeout: 15000 })
      await expect(page.locator('.margo-mobile-tabbar')).toBeVisible()
    })

    test('gated resonate action shows auth dialog above tab bar', async ({ page }) => {
      await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      const resonate = page.locator('[data-margo-resonate], button[aria-label*="Resonate"], button[aria-label*="resonate"]').first()
      await resonate.click({ timeout: 15000 })
      const dialog = page.locator('[data-margo-auth-gate-modal]')
      await expect(dialog).toBeVisible({ timeout: 10000 })
      await expect(page.locator('.margo-mobile-tabbar')).toBeVisible()
      const tabBarBox = await page.locator('.margo-mobile-tabbar').boundingBox()
      const dialogBox = await dialog.boundingBox()
      expect(tabBarBox && dialogBox).toBeTruthy()
      if (tabBarBox && dialogBox) {
        expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(tabBarBox.y + 2)
      }
    })
  })
}
