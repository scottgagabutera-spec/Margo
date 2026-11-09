import { test, expect, type Page } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

async function expectContentBelowTabBar(page: Page, selector: string) {
  const tabBar = page.locator('.margo-feed-content-tab-bar')
  await expect(tabBar).toBeVisible({ timeout: 30_000 })
  const content = page.locator(selector).first()
  await expect(content).toBeVisible({ timeout: 30_000 })
  const tabBottom = await tabBar.evaluate((el) => el.getBoundingClientRect().bottom)
  const contentTop = await content.evaluate((el) => el.getBoundingClientRect().top)
  expect(contentTop).toBeGreaterThanOrEqual(tabBottom - 1)
}

test('Memories, Shorts, Echoes: first content below sub-tab row on entry', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForSelector('.margo-feed-content-tab-bar', { timeout: 60_000 })
  await page.locator('.margo-feed-content-tab', { hasText: 'Memories' }).tap()
  await page.waitForURL(/[?&]tab=memories/, { timeout: 15_000 })
  await expectContentBelowTabBar(page, '.margo-feed-memories-kinds')

  await page.goto(`${BASE}/feed?e2eShorts=1&tab=shorts`, { waitUntil: 'load', timeout: 60_000 })
  await expect(page.locator('.margo-feed-content-tab-bar')).toBeVisible({ timeout: 60_000 })
  await expectContentBelowTabBar(page, '.margo-feed-shorts-pager, .margo-feed-shorts-empty')

  await page.locator('.margo-feed-content-tab', { hasText: 'Echoes' }).tap()
  await page.waitForURL(/tab=echoes/, { timeout: 15_000 })
  await expectContentBelowTabBar(
    page,
    '.margo-feed-echoes-tab__card, .margo-feed-echoes-tab__card--skeleton',
  )
})
