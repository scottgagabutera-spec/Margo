import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'
const DESKTOP = [640, 834, 1180, 1440, 1920]
const PHONE = [360, 390, 430]

for (const width of DESKTOP) {
  test.describe(`lyric card width @${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('680px column and lyric uses ≥90% of card inner width when wrapping', async ({ page }) => {
      await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(1200)
      const column = page.locator('.margo-feed-column, .margo-feed-post-list').first()
      await expect(column).toBeVisible({ timeout: 15000 })
      const colBox = await column.boundingBox()
      expect(colBox).toBeTruthy()
      if (colBox) {
        expect(colBox.width).toBeLessThanOrEqual(684)
        expect(colBox.width).toBeGreaterThanOrEqual(Math.min(width, 680))
      }
      const card = page.locator('.margo-post-card').first()
      if ((await card.count()) === 0) test.skip()
      const lyric = card.locator('.margo-post-card__lyric-zone').first()
      await expect(lyric).toBeVisible()
      const ratio = await lyric.evaluate((zone) => {
        const cardEl = zone.closest('.margo-post-card__body') ?? zone.closest('.margo-post-card')
        if (!cardEl) return 0
        const inner = cardEl.getBoundingClientRect().width
        const lw = zone.getBoundingClientRect().width
        return inner > 0 ? lw / inner : 0
      })
      expect(ratio).toBeGreaterThanOrEqual(0.9)
      const maxW = await lyric.evaluate((el) => getComputedStyle(el).maxWidth)
      expect(maxW).toBe('100%')
      const metrics = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }))
      expect(metrics.sw).toBe(metrics.cw)
    })
  })
}

for (const width of PHONE) {
  test.describe(`lyric card phone @${width}px`, () => {
    test.use({ viewport: { width, height: 844 } })

    test('lyric zone max-width stays 36ch (unchanged from main)', async ({ page }) => {
      await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(1200)
      const lyric = page.locator('.margo-post-card__lyric-zone').first()
      if ((await lyric.count()) === 0) test.skip()
      const maxW = await lyric.evaluate((el) => getComputedStyle(el).maxWidth)
      expect(maxW).toBe('36ch')
      const box = await lyric.boundingBox()
      expect(box).toBeTruthy()
    })
  })
}
