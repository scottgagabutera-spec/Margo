import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

async function menuInViewport(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const menu = document.querySelector(
      '[data-margo-profile-account-menu="popover"], [data-margo-profile-account-menu="sheet"]',
    ) as HTMLElement | null
    if (!menu) return { ok: false, reason: 'no menu' }
    const dialog = menu.querySelector('[role="dialog"]') as HTMLElement | null ?? menu
    const r = dialog.getBoundingClientRect()
    const vw = document.documentElement.clientWidth
    const vh = document.documentElement.clientHeight
    const ok =
      r.left >= -1 &&
      r.right <= vw + 1 &&
      r.top >= -1 &&
      r.bottom <= vh + 1
    return {
      ok,
      rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
      vw,
      vh,
      scrollWidth: document.documentElement.scrollWidth,
    }
  })
}

for (const width of [320, 360, 390, 768, 1280] as const) {
  test.describe(`profile account menu @${width}px`, () => {
    test.use({ viewport: { width, height: width >= 768 ? 900 : 844 } })

    test('menu stays inside viewport on own profile', async ({ page }) => {
      await page.goto(`${BASE}/you`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(1200)
      const trigger = page.getByRole('button', { name: 'Account menu' })
      if ((await trigger.count()) === 0) {
        test.skip(true, 'Signed-in own profile required on preview')
      }
      await trigger.click()
      await expect(page.locator('[data-margo-profile-account-menu]').first()).toBeVisible({ timeout: 5000 })
      const check = await menuInViewport(page)
      expect(check.ok, JSON.stringify(check)).toBeTruthy()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
      expect(overflow).toBe(false)
    })
  })
}

for (const width of [320, 360, 390, 768, 1280] as const) {
  test(`You tab portrait @${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width >= 768 ? 900 : 844 })
    await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(1000)
    const tab = page.locator('.margo-mobile-tabbar a[aria-label="You"]')
    if ((await tab.count()) === 0) {
      test.skip(true, 'Signed-in session required for You portrait tab')
    }
    await expect(tab).toBeVisible()
    await expect(tab.locator('.margo-you-tab-portrait, .margo-portrait-avatar')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    expect(overflow).toBe(false)
  })
}

test('welcome step 3 shows two roles and artist creator chips', async ({ page }) => {
  await page.goto(`${BASE}/welcome?step=3`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await expect(page.locator('[data-margo-welcome="loading"]')).toHaveCount(0, { timeout: 20000 })
  const ready = page.locator('[data-margo-welcome="ready"]')
  if (!(await ready.isVisible().catch(() => false))) {
    test.skip(true, 'Sign-in required on preview for welcome wizard')
  }
  await expect(page.locator('[data-margo-welcome-role="listener"]')).toBeVisible()
  await expect(page.locator('[data-margo-welcome-role="artist"]')).toBeVisible()
  await expect(page.locator('[data-margo-welcome-role="both"]')).toHaveCount(0)
  await page.locator('[data-margo-welcome-role="artist"]').click()
  await expect(page.locator('[data-margo-welcome-creator-type]')).toBeVisible()
})
