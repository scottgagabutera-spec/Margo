import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'

async function readVars(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const s = getComputedStyle(document.documentElement)
    const num = (name: string) => parseFloat(s.getPropertyValue(name)) || 0
    return {
      headerH: num('--margo-header-h'),
      navH: num('--nav-height'),
      feedTabsH: num('--margo-feed-tab-bar-h'),
      tabbarH: num('--margo-tabbar-h'),
    }
  })
}

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

test('chrome vars publish on feed and feed tab bar height updates', async ({ page }) => {
  await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForSelector('.margo-feed-content-tab-bar', { timeout: 30_000 })

  const onFeed = await readVars(page)
  expect(onFeed.headerH).toBeGreaterThan(0)
  expect(onFeed.navH).toBe(onFeed.headerH)
  expect(onFeed.feedTabsH).toBeGreaterThan(0)
  expect(onFeed.tabbarH).toBeGreaterThan(0)

  const before = onFeed.feedTabsH
  await page.addStyleTag({
    content: '.margo-feed-content-tab { padding-top: 18px; padding-bottom: 18px; }',
  })
  await page.waitForFunction(
    (prev) => {
      const h = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--margo-feed-tab-bar-h'))
      return h > prev
    },
    before,
    { timeout: 5_000 },
  )
  const after = (await readVars(page)).feedTabsH
  expect(after).toBeGreaterThan(before)
})
