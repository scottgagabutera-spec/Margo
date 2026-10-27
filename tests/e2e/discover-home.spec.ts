import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
  { width: 834, height: 1194 },
  { width: 1280, height: 720 },
  { width: 1536, height: 864 },
  { width: 2560, height: 1440 },
] as const

async function expectNoHorizontalScroll(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  expect(overflow).toBe(false)
}

test.describe('discover home @signed-out', () => {
  test('structure: sections, no mixtape or takeover', async ({ page }) => {
    await page.goto(`${BASE}/discover`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.locator('[data-discover-home]')).toBeVisible({ timeout: 45000 })
    await expect(page.locator('[data-discover-vibe-row]')).toBeVisible()
    await expect(page.locator('[data-discover-play-all]')).toBeVisible()
    await expect(page.getByText('Mixtape', { exact: false })).toHaveCount(0)
    await expect(page.getByText('auto-continues', { exact: false })).toHaveCount(0)
    await expect(page.locator('text=/Lines picked for/i')).toHaveCount(0)
    const titles = page.locator('[data-discover-section-title]')
    await expect(titles.first()).toBeVisible({ timeout: 45000 })
    await expect(titles.first()).toHaveText('Moments')
    const sectionTexts = await titles.allTextContents()
    if (sectionTexts.includes('Songs') && sectionTexts.includes('Moments')) {
      expect(sectionTexts.indexOf('Songs')).toBeGreaterThan(sectionTexts.indexOf('Moments'))
    }
    if (sectionTexts.includes('Artists') && sectionTexts.includes('Songs')) {
      expect(sectionTexts.indexOf('Artists')).toBeGreaterThan(sectionTexts.indexOf('Songs'))
    }
    if (sectionTexts.includes('Resonance') && sectionTexts.includes('Artists')) {
      expect(sectionTexts.indexOf('Resonance')).toBeGreaterThan(sectionTexts.indexOf('Artists'))
    }
  })

  test('section title typography', async ({ page }) => {
    await page.goto(`${BASE}/discover`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    const title = page.locator('[data-discover-section-title]').first()
    await expect(title).toBeVisible({ timeout: 45000 })
    const fontSize = await title.evaluate(el => getComputedStyle(el).fontSize)
    const weight = await title.evaluate(el => getComputedStyle(el).fontWeight)
    expect(fontSize).toBe('16px')
    expect(Number(weight)).toBeGreaterThanOrEqual(600)
  })

  for (const vp of VIEWPORTS) {
    test(`no horizontal scroll ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp)
      await page.goto(`${BASE}/discover`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await expectNoHorizontalScroll(page)
    })
  }
})
