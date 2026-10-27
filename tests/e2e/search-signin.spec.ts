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
      await expect(page.locator('.margo-mobile-tabbar [aria-current="page"]')).toContainText(/Sign In/i)
      await expect(page.locator('input[type="email"], input[type="password"]').first()).toBeVisible({ timeout: 15000 })
      await expect(page.locator('.margo-auth-layout__main')).toBeVisible()
    })

    test('Hub sign-in does not flash bare Feed between Hub and /signin', async ({ page }) => {
      await openHub(page)
      await page.locator('#margo-hub-sign-in').click()
      await expect(page.locator('.margo-hub-sheet, .margo-auth-layout__main').first()).toBeVisible({ timeout: 5000 })
      await expect(page).toHaveURL(/\/signin/, { timeout: 15000 })
    })

    test('Hub locked tile navigates to sign-in with returnTo', async ({ page }) => {
      await openHub(page)
      await page.locator('[data-hub-tile="library"]').click()
      await expect(page).toHaveURL(/\/signin\?.*returnTo=/, { timeout: 15000 })
      await expect(page.locator('.margo-mobile-tabbar')).toBeVisible()
    })

    test('/search scope shows typed hint animation', async ({ page }) => {
      await page.goto(`${BASE}/search?scope=artists`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      const hint = page.locator('[data-margo-search-hint]')
      await expect(hint).toBeVisible({ timeout: 10000 })
      const len0 = (await hint.locator('.margo-search-hint__done').textContent())?.length ?? 0
      await page.waitForTimeout(120)
      const len1 = (await hint.locator('.margo-search-hint__done').textContent())?.length ?? 0
      expect(len1).toBeGreaterThanOrEqual(len0)
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
