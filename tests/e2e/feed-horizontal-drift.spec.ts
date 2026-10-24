import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

async function feedPane(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(1200)
  const pane = page.locator('[data-margo-primary-tab="feed"]')
  await expect(pane).toHaveCount(1, { timeout: 15000 })
  return pane
}

async function metrics(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const pane = document.querySelector('[data-margo-primary-tab="feed"]') as HTMLElement | null
    const doc = document.documentElement
    return {
      docScrollLeft: doc.scrollLeft,
      docScrollWidth: doc.scrollWidth,
      docClientWidth: doc.clientWidth,
      paneScrollLeft: pane?.scrollLeft ?? null,
      paneScrollWidth: pane?.scrollWidth ?? null,
      paneClientWidth: pane?.clientWidth ?? null,
    }
  })
}

async function diagonalDrag(page: import('@playwright/test').Page) {
  const box = await page.locator('[data-margo-primary-tab="feed"]').boundingBox()
  const x0 = (box?.x ?? 0) + Math.min(180, (box?.width ?? 360) * 0.55)
  const y0 = (box?.y ?? 0) + 220
  await page.mouse.move(x0, y0)
  await page.mouse.down()
  await page.mouse.move(x0 - 35, y0 + 140, { steps: 14 })
  await page.mouse.up()
  await page.waitForTimeout(250)
}

async function horizontalDrag(page: import('@playwright/test').Page) {
  const box = await page.locator('[data-margo-primary-tab="feed"]').boundingBox()
  const x0 = (box?.x ?? 0) + Math.min(200, (box?.width ?? 360) * 0.6)
  const y0 = (box?.y ?? 0) + 280
  await page.mouse.move(x0, y0)
  await page.mouse.down()
  await page.mouse.move(x0 - 90, y0 + 4, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(250)
}

for (const width of [360, 390, 430]) {
  test.describe(`feed horizontal lock @${width}px`, () => {
    test.use({ viewport: { width, height: 844 } })

    test('diagonal drag keeps scrollLeft at 0', async ({ page }) => {
      await feedPane(page)
      await diagonalDrag(page)
      const m = await metrics(page)
      expect(m.docScrollLeft).toBe(0)
      expect(m.docScrollWidth).toBeLessThanOrEqual(m.docClientWidth + 1)
      expect(m.paneScrollLeft ?? 0).toBe(0)
      if (m.paneScrollWidth != null && m.paneClientWidth != null) {
        expect(m.paneScrollWidth).toBeLessThanOrEqual(m.paneClientWidth + 1)
      }
    })

    test('horizontal drag in content does not leave pane shifted', async ({ page }) => {
      await feedPane(page)
      await horizontalDrag(page)
      const m = await metrics(page)
      expect(m.paneScrollLeft ?? 0).toBe(0)
    })

    test('forced pane scrollLeft resets on scroll', async ({ page }) => {
      await feedPane(page)
      await page.evaluate(() => {
        const pane = document.querySelector('[data-margo-primary-tab="feed"]') as HTMLElement | null
        if (pane) pane.scrollLeft = 48
      })
      await page.evaluate(() => {
        const pane = document.querySelector('[data-margo-primary-tab="feed"]') as HTMLElement | null
        pane?.dispatchEvent(new Event('scroll'))
      })
      const m = await metrics(page)
      expect(m.paneScrollLeft ?? 0).toBe(0)
    })
  })
}

test.describe('feed tab navigation after horizontal drags', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('Discover tab still switches after diagonal drags on feed', async ({ page }) => {
    await feedPane(page)
    await diagonalDrag(page)
    await horizontalDrag(page)
    const m = await metrics(page)
    expect(m.paneScrollLeft ?? 0).toBe(0)
    await page.locator('nav.margo-mobile-tabbar a[href="/discover"]').click()
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/discover')
  })
})
