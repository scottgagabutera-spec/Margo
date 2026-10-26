import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

async function openHubMobile(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(600)
  await page.locator('.margo-mobile-tabbar button[aria-label^="Hub"]').click({ timeout: 10000 })
  const launcher = page.locator('.margo-hub-launcher')
  await expect(launcher).toBeVisible({ timeout: 10000 })
  return launcher
}

async function openHubDesktop(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(600)
  await page.locator('.margo-nav-bar button[aria-label^="Hub"]').click({ timeout: 10000 })
  const launcher = page.locator('.margo-hub-launcher')
  await expect(launcher).toBeVisible({ timeout: 10000 })
  return launcher
}

async function assertContained(page: import('@playwright/test').Page, rootSelector: string) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel) as HTMLElement | null
    if (!root) return { ok: false, reason: 'missing root' }
    const rootBox = root.getBoundingClientRect()
    const vw = document.documentElement.clientWidth
    const offenders: string[] = []
    const check = (el: Element) => {
      const box = el.getBoundingClientRect()
      if (box.width === 0 && box.height === 0) return
      if (box.left < -1 || box.top < -1 || box.right > vw + 1 || box.bottom > rootBox.bottom + 1) {
        offenders.push((el as HTMLElement).className || el.tagName)
      }
    }
    root.querySelectorAll('.margo-hub-tile, .margo-hub-tile__icon-wrap, .margo-hub-tile__label, .margo-hub-tile__badge, .margo-hub-tile__lock').forEach(check)
    if (root.scrollWidth > root.clientWidth + 1) offenders.push('horizontal-scroll')
    return { ok: offenders.length === 0, offenders, docScroll: document.documentElement.scrollLeft }
  }, rootSelector)
}

for (const width of [360, 390, 834, 1440]) {
  test.describe(`hub launcher grid @${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('signed-out layout: Stage first, locks, no dashed boxes, containment', async ({ page }) => {
      const rootSel = '.margo-hub-launcher'
      if (width >= 640) await openHubDesktop(page)
      else await openHubMobile(page)

      const tiles = page.locator(`${rootSel} [data-hub-tile]`)
      await expect(tiles.first()).toHaveAttribute('data-hub-tile', 'stage')

      for (const id of ['messages', 'notifications', 'library'] as const) {
        await expect(page.locator(`${rootSel} [data-hub-tile="${id}"]`)).toBeVisible()
      }
      await expect(page.locator(`${rootSel} [data-hub-tile="stage"] .margo-hub-tile__lock`)).toHaveCount(0)
      await expect(page.locator(`${rootSel} .margo-hub-tile__lock`)).toHaveCount(3)

      const dashed = await page.locator(`${rootSel} [style*="dashed"]`).count()
      expect(dashed).toBe(0)

      await expect(page.locator(`${rootSel} .margo-hub-identity`)).toHaveCount(0)
      await expect(page.locator(`${rootSel} .margo-hub-tile__caption`)).toHaveCount(0)

      const tileBox = await page.locator(`${rootSel} [data-hub-tile="stage"]`).boundingBox()
      expect(tileBox?.height ?? 0).toBeGreaterThanOrEqual(40)
      expect(tileBox?.width ?? 0).toBeGreaterThanOrEqual(40)

      const contained = await assertContained(page, rootSel)
      expect(contained.ok, JSON.stringify(contained)).toBeTruthy()
      expect(contained.docScroll).toBe(0)
    })
  })
}

test('9+ badge class fits inside tile (unit DOM fixture)', async ({ page }) => {
  await page.setContent(`
    <div class="margo-hub-grid" style="width:84px;padding:8px;box-sizing:border-box">
      <a class="margo-hub-tile" style="position:relative;display:block">
        <span class="margo-hub-tile__badge">9+</span>
      </a>
    </div>
  `)
  const ok = await page.evaluate(() => {
    const tile = document.querySelector('.margo-hub-tile')!
    const badge = document.querySelector('.margo-hub-tile__badge')!
    const tb = tile.getBoundingClientRect()
    const bb = badge.getBoundingClientRect()
    return bb.left >= tb.left && bb.right <= tb.right && bb.top >= tb.top && bb.bottom <= tb.bottom
  })
  expect(ok).toBe(true)
})
