import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'
const DESKTOP = [640, 834, 1180, 1440, 1920]

for (const width of DESKTOP) {
  test.describe(`lyric card width @${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('feed column about 680px and lyric zone wider measure', async ({ page }) => {
      await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(1200)
      const column = page.locator('.margo-feed-column, .margo-feed-post-list').first()
      await expect(column).toBeVisible({ timeout: 15000 })
      const colBox = await column.boundingBox()
      expect(colBox).toBeTruthy()
      if (colBox) {
        expect(colBox.width).toBeLessThanOrEqual(684)
        expect(colBox.width).toBeGreaterThan(640)
      }
      const lyric = page.locator('.margo-post-card__lyric-zone').first()
      if ((await lyric.count()) === 0) test.skip()
      const chWidth = await lyric.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { maxWidth: cs.maxWidth, width: el.getBoundingClientRect().width }
      })
      expect(chWidth.maxWidth).toBe('46ch')
      const metrics = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }))
      expect(metrics.sw).toBe(metrics.cw)
    })
  })
}

test.describe('lyric card phone unchanged @390', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('column uses full width under 640', async ({ page }) => {
    await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(1200)
    const column = page.locator('.margo-feed-column').first()
    const box = await column.boundingBox()
    expect(box).toBeTruthy()
    if (box) {
      expect(box.width).toBeGreaterThan(350)
      expect(box.width).toBeLessThanOrEqual(390)
    }
    const lyric = page.locator('.margo-post-card__lyric-zone').first()
    if ((await lyric.count()) > 0) {
      const maxW = await lyric.evaluate((el) => getComputedStyle(el).maxWidth)
      expect(maxW).toBe('36ch')
    }
  })
})
