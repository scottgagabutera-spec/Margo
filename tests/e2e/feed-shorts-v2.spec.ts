import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'
const WIDTHS = [360, 390, 430, 640, 834, 1180, 1440, 1920]

async function openShortsTab(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/feed?tab=shorts&e2eShorts=1`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(1200)
  const shortsTab = page.getByRole('button', { name: /^Shorts$/i })
  if (await shortsTab.count()) {
    await shortsTab.click()
    await page.waitForTimeout(800)
  }
}

async function requireShortsFrame(page: import('@playwright/test').Page) {
  const frame = page.locator('.margo-feed-shorts-slide__frame').first()
  if ((await frame.count()) === 0) {
    test.skip(true, 'Shorts catalog minimum not met on this deploy')
    return null
  }
  await expect(frame).toBeVisible({ timeout: 20000 })
  return frame
}

for (const width of WIDTHS) {
  test.describe(`feed shorts @${width}px`, () => {
    test.use({ viewport: { width, height: width < 640 ? 844 : 900 } })

    test('9:16 frame, meta inside, no horizontal overflow', async ({ page }) => {
      await openShortsTab(page)
      const frame = await requireShortsFrame(page)
      if (!frame) return
      const meta = frame.locator('.margo-feed-shorts-slide__meta')
      await expect(meta).toBeVisible()
      const box = await frame.boundingBox()
      expect(box).toBeTruthy()
      if (box && box.width > 0) {
        const ratio = box.height / box.width
        expect(ratio).toBeGreaterThan(1.74)
        expect(ratio).toBeLessThan(1.79)
      }
      const metrics = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }))
      expect(metrics.sw).toBe(metrics.cw)
    })

    test('overlay typography scales with frame (cqw)', async ({ page }) => {
      await openShortsTab(page)
      const frame = await requireShortsFrame(page)
      if (!frame) return
      const songSize = await frame.locator('.margo-feed-shorts-slide__song').evaluate((el) =>
        parseFloat(getComputedStyle(el).fontSize),
      )
      const box = await frame.boundingBox()
      expect(box).toBeTruthy()
      if (box) {
        const expected = box.width * 0.046
        expect(Math.abs(songSize - expected)).toBeLessThan(3)
      }
    })

    test('scroll-snap and next-short peek on desktop', async ({ page }) => {
      test.skip(width < 640, 'peek layout is desktop-only')
      await openShortsTab(page)
      const pager = page.locator('.margo-feed-shorts-pager')
      if ((await pager.count()) === 0) test.skip()
      const frames = page.locator('.margo-feed-shorts-slide__frame')
      if ((await frames.count()) < 2) test.skip()
      const snap = await pager.evaluate((el) => getComputedStyle(el).scrollSnapType)
      expect(snap).toContain('mandatory')
      const first = await frames.nth(0).boundingBox()
      const second = await frames.nth(1).boundingBox()
      expect(first && second).toBeTruthy()
      if (first && second) {
        expect(second.y).toBeLessThan(first.y + first.height)
      }
    })

    test('active slide exposes sound control and persists unmute', async ({ page }) => {
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

test('two-column layout when viewport fits pair @1920', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await openShortsTab(page)
  const pager = page.locator('.margo-feed-shorts-pager')
  if ((await pager.count()) === 0) test.skip()
  const cols = await pager.getAttribute('data-shorts-cols')
  expect(cols).toBe('2')
})
