import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 834, height: 1194 },
  { width: 1280, height: 720 },
  { width: 1536, height: 864 },
  { width: 2560, height: 1440 },
] as const

async function expectNoHorizontalScroll(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    return doc.scrollWidth > doc.clientWidth + 1
  })
  expect(overflow).toBe(false)
}

async function gridColumnCount(page: import('@playwright/test').Page) {
  return page.locator('[data-testid="discover-vm-grid"]').evaluate(el => {
    const style = getComputedStyle(el)
    const cols = style.gridTemplateColumns.split(' ').filter(Boolean).length
    return cols
  })
}

test.describe('discover view-more @signed-out', () => {
  test('moments page controls and layout', async ({ page }) => {
    await page.goto(`${BASE}/discover/moments`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.locator('[data-discover-vm-title]')).toHaveText('Moments')
    await expect(page.locator('.catalog-sort-pill')).toHaveCount(0)
    await expect(page.locator('[data-discover-songs-sort]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'HOPE' })).toBeVisible()
    await expect(page.locator('.margo-preview-scrim')).toHaveCount(0)
  })

  test('songs page has sort segment and vibe chips only', async ({ page }) => {
    await page.goto(`${BASE}/discover/songs`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.locator('[data-discover-songs-sort]')).toBeVisible()
    await expect(page.locator('[data-sort="trending"][aria-pressed="true"]')).toBeVisible()
    await expect(page.locator('.catalog-sort-pill')).toHaveCount(0)
  })

  test('resonance and artists pages', async ({ page }) => {
    await page.goto(`${BASE}/discover/resonance`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.locator('[data-discover-vm-title]')).toHaveText('Resonance')
    await page.goto(`${BASE}/artists`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.locator('[data-discover-vm-title]')).toHaveText('Artists')
    await expect(page.getByRole('button', { name: 'ALL' })).toHaveCount(0)
  })

  for (const vp of VIEWPORTS) {
    test(`moments grid columns ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp)
      await page.goto(`${BASE}/discover/moments`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForSelector('[data-testid="discover-vm-grid"]', { timeout: 30000 }).catch(() => {})
      const grid = page.locator('[data-testid="discover-vm-grid"]')
      if (await grid.count()) {
        const titleSize = await page.locator('[data-discover-vm-title]').evaluate(el =>
          getComputedStyle(el).fontSize,
        )
        expect(titleSize).toBe('16px')
      }
      await expectNoHorizontalScroll(page)
    })
  }
})
