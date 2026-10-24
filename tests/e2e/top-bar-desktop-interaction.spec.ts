import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

const WIDTHS = [640, 834, 1180, 1440, 1920]

type Hit = { tag: string; id: string | null; cls: string | null; label: string | null }

async function centerHit(page: import('@playwright/test').Page, selector: string): Promise<Hit | null> {
  const box = await page.locator(selector).first().boundingBox()
  if (!box) return null
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  return page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y)
    if (!el) return null
    const interactive =
      el.closest('button, a, [role="button"]') ?? el
    return {
      tag: interactive.tagName,
      id: interactive.id || null,
      cls:
        interactive.className && typeof interactive.className === 'string'
          ? interactive.className.slice(0, 80)
          : null,
      label:
        interactive.getAttribute('aria-label') ||
        (interactive as HTMLElement).innerText?.slice(0, 40) ||
        null,
    }
  }, { x, y })
}

for (const width of WIDTHS) {
  test.describe(`desktop top bar @${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('Hub opens panel on click', async ({ page }) => {
      await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(800)
      const hub = page.locator('.margo-nav-bar button[aria-label^="Hub"]')
      await expect(hub).toBeVisible({ timeout: 15000 })
      const hit = await centerHit(page, '.margo-nav-bar button[aria-label^="Hub"]')
      expect(hit?.tag).toBe('BUTTON')
      const t0 = Date.now()
      await hub.click({ timeout: 8000 })
      await expect(page.locator('.margo-hub-panel')).toBeVisible({ timeout: 8000 })
      // WebKit on cold preview/production can exceed 4s; visibility + hit test are the UX gate.
      expect(Date.now() - t0).toBeLessThan(8000)
    })

    test('Send a line navigates to compose', async ({ page }) => {
      await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(800)
      const pill = page.locator('.margo-desktop-nav a[href="/compose"]')
      await expect(pill).toBeVisible({ timeout: 15000 })
      const hit = await centerHit(page, '.margo-desktop-nav a[href="/compose"]')
      expect(hit?.tag).toBe('A')
      const t0 = Date.now()
      await pill.click({ timeout: 8000 })
      await page.waitForURL(/\/compose/, { timeout: 15000 })
      expect(Date.now() - t0).toBeLessThan(8000)
    })

    test('Feed link responds', async ({ page }) => {
      await page.goto(`${BASE}/discover`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(800)
      const feed = page.locator('.margo-desktop-nav a[href="/feed"]')
      await expect(feed).toBeVisible()
      const hit = await centerHit(page, '.margo-desktop-nav a[href="/feed"]')
      expect(hit?.tag).toBe('A')
      await feed.click({ timeout: 8000 })
      await page.waitForURL(/\/feed/, { timeout: 15000 })
    })

    test('Discover link responds', async ({ page }) => {
      await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(800)
      const link = page.locator('.margo-desktop-nav a[href="/discover"]')
      await expect(link).toBeVisible()
      const hit = await centerHit(page, '.margo-desktop-nav a[href="/discover"]')
      expect(hit?.tag).toBe('A')
      await link.click({ timeout: 8000 })
      await page.waitForURL(/\/discover/, { timeout: 15000 })
    })
  })
}

test.describe('lyric under nav gap passes through', () => {
  test.use({ viewport: { width: 834, height: 900 } })

  test('elementFromPoint on feed lyric is not the nav shell', async ({ page }) => {
    await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(1500)
    const lyric = page.locator('.margo-feed-lyric, [data-margo-post-lyric], .margo-post-card').first()
    if ((await lyric.count()) === 0) {
      test.skip()
      return
    }
    const box = await lyric.boundingBox()
    if (!box) return
    const x = box.x + Math.min(40, box.width / 2)
    const y = Math.max(72, box.y + 8)
    const top = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y)
      return el?.closest('nav') ? 'nav' : el?.tagName ?? null
    }, { x, y })
    expect(top).not.toBe('nav')
  })
})
