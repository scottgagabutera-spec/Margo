import { test, expect, type Page } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
})

async function waitTabBar(page: Page) {
  await expect(page.locator('.margo-mobile-tabbar')).toBeVisible({ timeout: 20000 })
}

async function tapFeed(page: Page) {
  await page.locator('.margo-mobile-tabbar a[href="/feed"]').tap()
}

async function tapHub(page: Page) {
  await page.getByRole('button', { name: /^Hub/i }).tap()
}

async function tapSignIn(page: Page) {
  await page.locator('.margo-mobile-tabbar a[href*="/signin"]').tap()
}

async function assertFeed(page: Page) {
  await expect(page).toHaveURL(/\/feed/)
  await expect(page.locator('[data-margo-primary-tab="feed"][data-margo-primary-tab-shown="1"]')).toBeVisible()
}

async function assertHub(page: Page) {
  await expect(page.getByRole('dialog', { name: 'Hub' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Hub/i })).toHaveAttribute('aria-expanded', 'true')
}

async function assertSignIn(page: Page) {
  await expect(page).toHaveURL(/\/signin/)
  await expect(page.locator('[data-margo-primary-tab-shown="1"]')).toHaveCount(0)
  await expect(page.locator('.margo-mobile-tabbar a[href*="/signin"]')).toHaveAttribute('aria-current', 'page')
}

test('rapid Feed Hub Sign In x3 @390 touch', async ({ page }) => {
  await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await waitTabBar(page)

  for (let round = 0; round < 3; round++) {
    await tapHub(page)
    await assertHub(page)

    await tapSignIn(page)
    await assertSignIn(page)

    await tapHub(page)
    await assertHub(page)

    await tapSignIn(page)
    await assertSignIn(page)

    await tapFeed(page)
    await assertFeed(page)

    await tapHub(page)
    await assertHub(page)

    await tapFeed(page)
    await assertFeed(page)
  }
})
