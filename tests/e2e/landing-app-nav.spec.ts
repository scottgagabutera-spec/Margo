import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

const DESKTOP_WIDTHS = [640, 834, 1180, 1440, 1920]

type Hit = { tag: string; label: string | null }

async function centerHit(page: import('@playwright/test').Page, selector: string): Promise<Hit | null> {
  const box = await page.locator(selector).first().boundingBox()
  if (!box) return null
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  return page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y)
    if (!el) return null
    const interactive = el.closest('button, a, [role="button"]') ?? el
    return {
      tag: interactive.tagName,
      label:
        interactive.getAttribute('aria-label') ||
        (interactive as HTMLElement).innerText?.slice(0, 40) ||
        null,
    }
  }, { x, y })
}

for (const width of DESKTOP_WIDTHS) {
  test.describe(`landing app nav @${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('desktop top bar visible; landing header hidden', async ({ page }) => {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(900)
      await expect(page.locator('.margo-nav-bar')).toBeVisible({ timeout: 15000 })
      await expect(page.locator('.margo-landing-nav')).toBeHidden()
      await expect(page.locator('.margo-nav-bar .margo-desktop-nav a[href="/feed"]')).toBeVisible()
    })

    test('Post pill opens compose', async ({ page }) => {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(900)
      const pill = page.locator('.margo-desktop-nav a[href="/compose"]')
      await expect(pill).toBeVisible({ timeout: 15000 })
      const hit = await centerHit(page, '.margo-desktop-nav a[href="/compose"]')
      expect(hit?.tag).toBe('A')
      await pill.click({ timeout: 8000 })
      await page.waitForURL(/\/compose/, { timeout: 15000 })
    })

    test('Hub panel opens', async ({ page }) => {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(900)
      const hub = page.locator('.margo-nav-bar button[aria-label^="Hub"]')
      await expect(hub).toBeVisible({ timeout: 15000 })
      const hit = await centerHit(page, '.margo-nav-bar button[aria-label^="Hub"]')
      expect(hit?.tag).toBe('BUTTON')
      await hub.click({ timeout: 8000 })
      await expect(page.locator('.margo-hub-panel')).toBeVisible({ timeout: 5000 })
    })
  })
}

test.describe('landing phone layout unchanged @390', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('in-flow landing nav visible; app top bar hidden', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(900)
    await expect(page.locator('.margo-landing-nav')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.margo-nav-bar')).toBeHidden()
  })

  test('no horizontal overflow', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(900)
    const metrics = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
    }))
    expect(metrics.sw).toBe(metrics.cw)
  })
})

test.describe('landing stage search footer fade', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('footer fades while stage search focused', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(900)
    const search = page.locator('.margo-stage-zone input[type="search"], .margo-stage-zone input').first()
    await expect(search).toBeVisible({ timeout: 15000 })
    await search.focus()
    await page.waitForTimeout(300)
    await expect.poll(() =>
      page.evaluate(() => document.documentElement.hasAttribute('data-margo-stage-search')),
    ).toBe(true)
    const footerOpacity = await page.locator('.margo-landing-footer').evaluate((el) =>
      getComputedStyle(el).opacity,
    )
    expect(Number(footerOpacity)).toBeLessThan(0.5)
  })
})
