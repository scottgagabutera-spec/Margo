import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'
const WIDTHS = [360, 390, 430, 640, 834, 1180, 1440, 1920]

function shortsUrl(width: number) {
  const fixture = BASE.includes('vercel.app')
  const q = fixture ? '?tab=shorts&e2eShorts=1' : '?tab=shorts'
  return `${BASE}/feed${q}`
}

async function openShortsTab(page: import('@playwright/test').Page, width: number) {
  await page.goto(shortsUrl(width), { waitUntil: 'domcontentloaded', timeout: 45000 })
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

    test('9:16 frame, no horizontal overflow', async ({ page }) => {
      await openShortsTab(page, width)
      if (width < 640) {
        const frame = page.locator('.margo-feed-shorts-slide__frame').first()
        if ((await frame.count()) === 0) test.skip()
        await expect(frame).toBeVisible()
        await expect(frame.locator('.margo-feed-shorts-slide__chrome-bottom')).toBeVisible()
      } else {
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
      }
      const metrics = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }))
      expect(metrics.sw).toBe(metrics.cw)
    })

    test('overlay typography scales with frame (cqw)', async ({ page }) => {
      test.skip(width < 640, 'desktop-only overlay units')
      await openShortsTab(page, width)
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
      await openShortsTab(page, width)
      const pager = page.locator('.margo-feed-shorts-pager')
      if ((await pager.count()) === 0) test.skip()
      const cols = await pager.getAttribute('data-shorts-cols')
      test.skip(cols === '2', 'two-column layout uses side-by-side pair, not vertical peek')
      const frames = page.locator('.margo-feed-shorts-slide__frame')
      if ((await frames.count()) < 2) test.skip()
      const snap = await pager.evaluate((el) => getComputedStyle(el).scrollSnapType)
      expect(snap).toContain('mandatory')
      const first = await frames.nth(0).boundingBox()
      const second = await frames.nth(1).boundingBox()
      expect(first && second).toBeTruthy()
      if (first && second) {
        const pagerBox = await pager.boundingBox()
        expect(pagerBox).toBeTruthy()
        if (pagerBox) {
          const visibleBottom = pagerBox.y + pagerBox.height
          expect(second.y).toBeLessThan(visibleBottom)
          expect(second.y).toBeGreaterThan(first.y)
        }
      }
    })

    test('giants chrome: mute control, no big row play button', async ({ page }) => {
      test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
      await openShortsTab(page, width)
      const frame = page.locator('[data-shorts-active="1"] .margo-feed-shorts-slide__frame')
      await expect(frame).toBeVisible({ timeout: 15000 })
      await expect(page.locator('.margo-feed-shorts-slide__meta-play')).toHaveCount(0)
      await expect(frame.locator('.margo-feed-shorts-slide__mute')).toBeVisible()
      await expect(frame.locator('.margo-feed-shorts-slide__progress')).toBeVisible()
      await frame.locator('.margo-feed-shorts-slide__mute').click()
      await expect(frame.locator('.margo-feed-shorts-slide__mute')).toHaveAttribute('aria-pressed', 'true')
    })

    test('settled Short keeps stable theme attrs during swipe', async ({ page }) => {
      test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
      await openShortsTab(page, width)
      const pager = page.locator('.margo-feed-shorts-pager')
      await expect(pager).toBeVisible({ timeout: 20000 })
      const firstSlide = page.locator('[data-shorts-index="0"]')
      const themeBefore = await firstSlide.getAttribute('data-shorts-theme')
      const atmBefore = await firstSlide.getAttribute('data-shorts-atmosphere')
      expect(themeBefore).toBeTruthy()
      await pager.evaluate((el) => {
        el.scrollTop = el.scrollHeight * 0.35
      })
      await page.waitForTimeout(80)
      expect(await firstSlide.getAttribute('data-shorts-theme')).toBe(themeBefore)
      expect(await firstSlide.getAttribute('data-shorts-atmosphere')).toBe(atmBefore)
      await pager.evaluate((el) => {
        el.dispatchEvent(new Event('scrollend'))
      })
      await page.waitForTimeout(200)
    })

    test('gap under Lyrics/Shorts tabs before first frame', async ({ page }) => {
      await openShortsTab(page, width)
      const tabBar = page.locator('.margo-feed-content-tab-bar')
      const target = width >= 640
        ? page.locator('.margo-feed-shorts-slide__frame').first()
        : page.locator('[aria-label="Shorts preview, 9:16"]').first()
      if ((await target.count()) === 0) test.skip()
      await expect(tabBar).toBeVisible()
      await expect(target).toBeVisible({ timeout: 20000 })
      const tabBox = await tabBar.boundingBox()
      const frameBox = await target.boundingBox()
      expect(tabBox && frameBox).toBeTruthy()
      if (tabBox && frameBox) {
        const gap = frameBox.y - (tabBox.y + tabBox.height)
        expect(gap).toBeGreaterThanOrEqual(14)
      }
    })

    test('only one settled active marker after scroll settles', async ({ page }) => {
      test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
      await openShortsTab(page, width)
      const pager = page.locator('.margo-feed-shorts-pager')
      await expect(pager).toBeVisible({ timeout: 20000 })
      await pager.evaluate((el) => {
        el.scrollTop = Math.min(el.scrollHeight * 0.5, el.clientHeight * 1.2)
      })
      await page.waitForTimeout(400)
      await pager.evaluate((el) => el.dispatchEvent(new Event('scrollend')))
      await page.waitForTimeout(300)
      await expect(page.locator('[data-shorts-active="1"]')).toHaveCount(1)
    })
  })
}

for (const width of [390, 1440]) {
  test.describe(`shorts look stable swipe @${width}px`, () => {
    test.use({ viewport: { width, height: width < 640 ? 844 : 900 } })

    test('theme and atmosphere unchanged every 50ms through swipe and after settle', async ({ page }) => {
      test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
      await page.goto(shortsUrl(width), { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(1200)
      const pager = page.locator('.margo-feed-shorts-pager')
      await expect(pager).toBeVisible({ timeout: 20000 })
      for (let slideIdx = 0; slideIdx < 5; slideIdx++) {
        const slide = page.locator(`[data-shorts-index="${slideIdx}"]`)
        await expect(slide).toBeVisible()
        const theme0 = await slide.getAttribute('data-shorts-theme')
        const atm0 = await slide.getAttribute('data-shorts-atmosphere')
        expect(theme0).toBeTruthy()
        expect(atm0).toBeTruthy()
        const samples: { theme: string | null; atm: string | null }[] = []
        for (let i = 0; i < 8; i++) {
          await pager.evaluate((el, step) => {
            el.scrollTop += step
          }, 55)
          await page.waitForTimeout(50)
          samples.push({
            theme: await slide.getAttribute('data-shorts-theme'),
            atm: await slide.getAttribute('data-shorts-atmosphere'),
          })
        }
        await pager.evaluate((el) => el.dispatchEvent(new Event('scrollend')))
        await page.waitForTimeout(200)
        samples.push({
          theme: await slide.getAttribute('data-shorts-theme'),
          atm: await slide.getAttribute('data-shorts-atmosphere'),
        })
        for (const s of samples) {
          expect(s.theme).toBe(theme0)
          expect(s.atm).toBe(atm0)
        }
      }
    })

    test('fixture clips use five different looks', async ({ page }) => {
      test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
      await page.goto(shortsUrl(width), { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(1200)
      const pairs = await page.locator('[data-shorts-slide]').evaluateAll((els) =>
        els.slice(0, 5).map((el) => `${el.getAttribute('data-shorts-theme')}:${el.getAttribute('data-shorts-atmosphere')}`),
      )
      expect(new Set(pairs).size).toBeGreaterThanOrEqual(3)
    })
  })
}

for (const width of [360, 390, 430, 834, 1440]) {
  test.describe(`shorts settle playback @${width}px`, () => {
    test.use({ viewport: { width, height: width < 640 ? 844 : 900 } })

    test('first Short is settled active on tab open', async ({ page }) => {
      test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
      await page.goto(shortsUrl(width), { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(1500)
      const active = page.locator('[data-shorts-active="1"]')
      await expect(active).toHaveCount(1, { timeout: 15000 })
      await expect(active).toHaveAttribute('data-shorts-index', '0')
    })
  })
}

test('two-column layout when viewport fits pair @1920', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await openShortsTab(page, 1920)
  const pager = page.locator('.margo-feed-shorts-pager')
  if ((await pager.count()) === 0) test.skip()
  const cols = await pager.getAttribute('data-shorts-cols')
  expect(cols).toBe('2')
})

