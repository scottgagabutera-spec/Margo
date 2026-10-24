import { test } from '@playwright/test'
import fs from 'node:fs'

const OUT = '/opt/cursor/artifacts/screenshots'
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'

for (const width of [390, 768, 1024, 1440]) {
  test(`home + feed nav @${width}`, async ({ page }) => {
    fs.mkdirSync(OUT, { recursive: true })
    await page.setViewportSize({ width, height: 900 })
    try {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      await page.screenshot({ path: `${OUT}/layout-home-${width}.png`, fullPage: false })
      await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      await page.screenshot({ path: `${OUT}/layout-feed-${width}.png`, fullPage: false })
    } catch {
      test.skip(true, 'Dev server not running; layout capture skipped')
    }
  })
}
