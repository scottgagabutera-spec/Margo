/**
 * Optional reference capture for Scott's report — not part of default CI gate.
 * Run: PLAYWRIGHT_BASE_URL=https://trymargo.com npx playwright test tests/e2e/giants-shorts-reference.spec.ts
 */
import { test } from '@playwright/test'

test.describe('giants shorts reference (manual report)', () => {
  test('YouTube Shorts embed dimensions @390', async ({ page }) => {
    test.skip(!process.env.MARGO_MEASURE_GIANTS, 'Set MARGO_MEASURE_GIANTS=1 to run')
    await page.goto('https://www.youtube.com/shorts', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(4000)
    const video = page.locator('video').first()
    const box = await video.boundingBox().catch(() => null)
    console.log('[giants] youtube-shorts video box', box)
  })

  test('TikTok web @390', async ({ page }) => {
    test.skip(!process.env.MARGO_MEASURE_GIANTS, 'Set MARGO_MEASURE_GIANTS=1 to run')
    await page.goto('https://www.tiktok.com/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(4000)
    const main = page.locator('main').first()
    const box = await main.boundingBox().catch(() => null)
    console.log('[giants] tiktok main box', box)
  })
})
