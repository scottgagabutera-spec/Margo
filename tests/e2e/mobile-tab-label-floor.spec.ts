import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

async function tabLabels(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const nav = document.querySelector('.margo-mobile-tabbar')
    if (!nav) return { visible: false, labels: [] as { text: string; px: number; wraps: boolean }[] }
    const spans = [...nav.querySelectorAll('span')].filter((s) => {
      const t = s.textContent?.trim() ?? ''
      return t.length > 0 && t !== '●'
    })
    return {
      visible: getComputedStyle(nav).display !== 'none',
      labels: spans.map((el) => {
        const st = getComputedStyle(el)
        return {
          text: el.textContent?.trim() ?? '',
          px: parseFloat(st.fontSize),
          wraps: el.scrollWidth > el.clientWidth + 1,
        }
      }),
    }
  })
}

for (const width of [360, 390]) {
  test.describe(`mobile tab labels @${width}px`, () => {
    test.use({ viewport: { width, height: 844 } })

    test('labels are ~11px, single line, no overlap with compose', async ({ page }) => {
      await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(1000)
      const info = await tabLabels(page)
      expect(info.visible).toBe(true)
      for (const l of info.labels) {
        expect(l.px).toBeGreaterThanOrEqual(10.5)
        expect(l.px).toBeLessThanOrEqual(12)
        expect(l.wraps).toBe(false)
      }
      const compose = page.locator('.margo-mobile-tabbar a[href="/compose"]')
      const composeBox = await compose.boundingBox()
      expect(composeBox).toBeTruthy()
      for (const label of ['Feed', 'Discover', 'Hub']) {
        const link = page.locator('.margo-mobile-tabbar').getByText(label, { exact: true })
        const box = await link.boundingBox()
        if (!box || !composeBox) continue
        const overlap =
          box.x < composeBox.x + composeBox.width &&
          box.x + box.width > composeBox.x &&
          box.y < composeBox.y + composeBox.height &&
          box.y + box.height > composeBox.y
        expect(overlap).toBe(false)
      }
    })
  })
}

test.describe('mobile tab labels RTL @390px', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('RTL keeps labels on one line', async ({ page }) => {
    await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.evaluate(() => {
      document.documentElement.setAttribute('dir', 'rtl')
    })
    await page.waitForTimeout(400)
    const info = await tabLabels(page)
    expect(info.visible).toBe(true)
    for (const l of info.labels) {
      expect(l.wraps).toBe(false)
    }
  })
})
