import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

const VIEWPORTS: { w: number; h: number }[] = [
  { w: 320, h: 568 },
  { w: 360, h: 640 },
  { w: 360, h: 800 },
  { w: 390, h: 844 },
  { w: 412, h: 915 },
  { w: 430, h: 932 },
  { w: 834, h: 1194 },
  { w: 1280, h: 720 },
  { w: 1366, h: 768 },
  { w: 1440, h: 900 },
  { w: 1536, h: 864 },
  { w: 1920, h: 1080 },
  { w: 2560, h: 1440 },
  { w: 980, h: 2000 },
]

async function openShorts(page: import('@playwright/test').Page) {
  const q = BASE.includes('vercel.app') ? '?tab=shorts&e2eShorts=1' : '?tab=shorts'
  await page.goto(`${BASE}/feed${q}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(1000)
  const tab = page.getByRole('button', { name: /^Shorts$/i })
  if (await tab.count()) await tab.click()
  await page.waitForTimeout(600)
  const pager = page.locator('.margo-feed-shorts-pager')
  if ((await pager.count()) === 0) return false
  await expect(pager.locator('.margo-feed-shorts-slide__frame').first()).toBeVisible({ timeout: 20000 })
  return true
}

for (const { w, h } of VIEWPORTS) {
  test.describe(`shorts one-card layout @${w}x${h}`, () => {
    test.use({ viewport: { width: w, height: h } })

    test('single visible short, aspect, no peek, arrows, no h-scroll', async ({ page }) => {
      const ok = await openShorts(page)
      if (!ok) test.skip(true, 'Shorts catalog minimum not met')

      const pager = page.locator('.margo-feed-shorts-pager')
      const metrics = await page.evaluate(() => {
        const pagerEl = document.querySelector('.margo-feed-shorts-pager') as HTMLElement | null
        if (!pagerEl) return null
        const pr = pagerEl.getBoundingClientRect()
        const frames = [...pagerEl.querySelectorAll('.margo-feed-shorts-slide__frame')]
        const first = frames[0]?.getBoundingClientRect()
        const second = frames[1]?.getBoundingClientRect()
        const active = pagerEl.querySelector('[data-shorts-active="1"] .margo-feed-shorts-slide__frame')
        const ar = active?.getBoundingClientRect()
        return {
          sw: document.documentElement.scrollWidth,
          cw: document.documentElement.clientWidth,
          pr,
          first,
          second,
          ar,
          arrowCount: document.querySelectorAll('.margo-feed-shorts-arrow').length,
        }
      })
      expect(metrics).toBeTruthy()
      if (!metrics?.ar) test.skip(true, 'no active frame')
      expect(metrics!.sw).toBe(metrics!.cw)

      if (w >= 640) {
        expect(metrics!.arrowCount).toBe(2)
        const ratio = metrics!.ar!.height / metrics!.ar!.width
        expect(ratio).toBeGreaterThan(1.76)
        expect(ratio).toBeLessThan(1.79)
      } else {
        expect(metrics!.arrowCount).toBe(0)
      }

      const bottom = metrics!.pr.bottom
      expect(metrics!.ar!.bottom).toBeLessThanOrEqual(bottom + 1)
      expect(metrics!.ar!.top).toBeGreaterThanOrEqual(metrics!.pr.top - 1)

      if (metrics!.second) {
        expect(metrics!.second.top).toBeGreaterThanOrEqual(bottom - 1)
      }

      if (w <= 360 && h <= 640) {
        const overlap = await page.evaluate(() => {
          const frame = document.querySelector('[data-shorts-active="1"] .margo-feed-shorts-slide__frame')
          if (!frame) return { ok: false, reason: 'no frame' }
          const boxes = [
            '.margo-feed-shorts-slide__mute',
            '.margo-feed-lyric',
            '.margo-feed-shorts-slide__meta-art',
            '.margo-feed-shorts-slide__song',
            '.margo-feed-shorts-slide__artist',
            '.margo-feed-shorts-slide__progress',
          ]
            .map((sel) => frame.querySelector(sel))
            .filter(Boolean)
            .map((el) => (el as Element).getBoundingClientRect())
          for (let i = 0; i < boxes.length; i++) {
            for (let j = i + 1; j < boxes.length; j++) {
              const a = boxes[i]
              const b = boxes[j]
              const hit =
                a.left < b.right
                && a.right > b.left
                && a.top < b.bottom
                && a.bottom > b.top
              if (hit) return { ok: false, reason: `overlap ${i}/${j}` }
            }
          }
          return { ok: true }
        })
        expect(overlap.ok, JSON.stringify(overlap)).toBeTruthy()
      }
    })

    test('arrow and keyboard advance one short @desktop only', async ({ page }) => {
      test.skip(w < 640, 'desktop arrows')
      const ok = await openShorts(page)
      if (!ok) test.skip(true, 'no shorts')
      const frames = page.locator('.margo-feed-shorts-slide__frame')
      if ((await frames.count()) < 2) test.skip(true, 'need 2 clips')
      const idx0 = await page.locator('[data-shorts-active="1"]').getAttribute('data-shorts-index')
      await page.locator('.margo-feed-shorts-arrow').nth(1).click()
      await page.waitForFunction(
        (prev) => {
          const el = document.querySelector('[data-shorts-active="1"]')
          return el?.getAttribute('data-shorts-index') !== prev
        },
        idx0,
        { timeout: 8000 },
      )
      const idx1 = await page.locator('[data-shorts-active="1"]').getAttribute('data-shorts-index')
      expect(idx1).not.toBe(idx0)
      await page.keyboard.press('ArrowUp')
      await page.waitForFunction(
        (prev) => {
          const el = document.querySelector('[data-shorts-active="1"]')
          return el?.getAttribute('data-shorts-index') === prev
        },
        idx0,
        { timeout: 8000 },
      )
      const idx2 = await page.locator('[data-shorts-active="1"]').getAttribute('data-shorts-index')
      expect(idx2).toBe(idx0)
    })
  })
}
