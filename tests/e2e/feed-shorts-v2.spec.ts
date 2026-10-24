import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'
const WIDTHS = [360, 390, 430, 640, 834, 1180, 1440, 1920]

async function openShortsTab(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/feed?tab=shorts`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(1200)
  const shortsTab = page.getByRole('button', { name: /^Shorts$/i })
  if (await shortsTab.count()) {
    await shortsTab.click()
    await page.waitForTimeout(800)
  }
}

for (const width of WIDTHS) {
  test.describe(`feed shorts @${width}px`, () => {
    test.use({ viewport: { width, height: width < 640 ? 844 : 900 } })

    test('frame width and meta inside frame', async ({ page }) => {
      await openShortsTab(page)
      const frame = page.locator('.margo-feed-shorts-slide__frame').first()
      if ((await frame.count()) === 0) {
        test.skip(true, 'Shorts catalog minimum not met on this deploy')
        return
      }
      await expect(frame).toBeVisible({ timeout: 15000 })
      const meta = frame.locator('.margo-feed-shorts-slide__meta')
      await expect(meta).toBeVisible()
      const box = await frame.boundingBox()
      expect(box).toBeTruthy()
      if (width >= 640 && box) {
        expect(box.width).toBeLessThanOrEqual(421)
        expect(box.width).toBeGreaterThan(380)
      }
      const metrics = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }))
      expect(metrics.sw).toBe(metrics.cw)
    })

    test('active slide exposes sound control', async ({ page }) => {
      await openShortsTab(page)
      const sound = page.locator('.margo-feed-shorts-slide__sound').first()
      if ((await sound.count()) === 0) {
        test.skip(true, 'Shorts catalog minimum not met on this deploy')
        return
      }
      await expect(sound).toBeVisible({ timeout: 15000 })
      await sound.click()
      await expect(sound).toHaveAttribute('aria-pressed', 'true')
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1200)
      await openShortsTab(page)
      const soundAfter = page.locator('.margo-feed-shorts-slide__sound').first()
      if ((await soundAfter.count()) === 0) test.skip()
      await expect(soundAfter).toHaveAttribute('aria-pressed', 'true')
    })

    test('no fill-motion flash on first active paint', async ({ page }) => {
      await openShortsTab(page)
      const slide = page.locator('[data-shorts-active="1"]').first()
      if ((await slide.count()) === 0) {
        test.skip(true, 'Shorts catalog minimum not met on this deploy')
        return
      }
      const fillImmediate = await slide.getAttribute('data-shorts-fill-motion')
      expect(fillImmediate).toBe('0')
      await page.waitForTimeout(120)
      const fillLater = await slide.getAttribute('data-shorts-fill-motion')
      expect(fillLater === '0' || fillLater === '1').toBeTruthy()
    })
  })
}
