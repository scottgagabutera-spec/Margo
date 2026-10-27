import { test, expect, type Page } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'

async function mockGenius(page: Page) {
  await page.route('**/api/genius?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: [
          { id: 'g1', song: 'Test Song', artist: 'Test Artist', artwork: '', source: 'genius' },
        ],
      }),
    })
  })
}

test.use({ viewport: { width: 360, height: 717 }, hasTouch: true })

test('landing clear song X is tappable after pick', async ({ page }) => {
  await mockGenius(page)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('html[data-margo-stage-client-ready]')
  await page.getByRole('searchbox', { name: /search song/i }).tap()
  await page.getByRole('searchbox', { name: /search song/i }).fill('test')
  await page.waitForResponse((r) => r.url().includes('/api/genius') && r.status() === 200)
  await page.getByRole('option', { name: /Test Song/i }).first().tap()
  await expect(page.getByRole('button', { name: /clear song/i })).toBeVisible({ timeout: 15000 })
  await expect(page.locator('html[data-margo-landing-song-flow]')).toBeAttached()

  const hit = await page.evaluate(() => {
    const btn = document.querySelector('.margo-stage-song-chip [aria-label="Clear song"]') as HTMLElement | null
    if (!btn) return { ok: false, reason: 'missing' }
    const r = btn.getBoundingClientRect()
    const nav = document.querySelector('.margo-landing-nav')
    const headerBottom = nav?.getBoundingClientRect().bottom ?? 0
    if (r.top < headerBottom - 1) return { ok: false, reason: 'under-header', top: r.top, headerBottom }
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const topEl = document.elementFromPoint(cx, cy)
    const ok = topEl === btn || (topEl instanceof Node && btn.contains(topEl))
    return { ok, reason: ok ? 'ok' : 'covered' }
  })
  expect(hit.ok, hit.reason).toBeTruthy()

  await page.getByRole('button', { name: /clear song/i }).tap()
  await expect(page.getByRole('searchbox', { name: /search song/i })).toBeVisible({ timeout: 10000 })
  await expect(page.locator('html[data-margo-landing-song-flow]')).not.toBeAttached()
})
