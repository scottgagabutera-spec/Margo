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

async function assertCalmLandingIdle(page: Page) {
  await expect(page.getByRole('searchbox', { name: /search song/i })).toBeVisible({ timeout: 15_000 })
  await expect(
    page.locator('.margo-stage-client-root .margo-stage-hero__wordmark-wrap').first(),
  ).toBeVisible({ timeout: 15_000 })
}

async function assertNoComposeHtmlAttrs(page: Page) {
  const html = page.locator('html')
  await expect(html).not.toHaveAttribute('data-margo-compose-search-active', /.*/)
  await expect(html).not.toHaveAttribute('data-margo-compose-shift-animate', /.*/)
  await expect(html).not.toHaveAttribute('data-margo-compose-compact', /.*/)
}

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

test.beforeEach(async ({ context }) => {
  await context.clearCookies()
})

async function waitLandingHydrated(page: Page) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.waitForSelector('html[data-margo-stage-client-ready]', { timeout: 30_000 })
}

async function clickLogoHome(page: Page) {
  await page.getByRole('link', { name: /expression home/i }).click()
  await page.waitForURL(`${BASE}/`, { timeout: 15_000 })
  await page.waitForSelector('html[data-margo-stage-client-ready]', { timeout: 30_000 })
}

test.describe('landing logo return from compose', () => {
  test('compose logo home restores calm landing without compose html attrs', async ({ page }) => {
    test.setTimeout(60_000)
    await mockGenius(page)
    await waitLandingHydrated(page)

    const search = page.getByRole('searchbox', { name: /search song/i })
    await search.tap()
    await search.fill('test')
    await page.waitForResponse((r) => r.url().includes('/api/genius') && r.status() === 200)
    await page.getByRole('option', { name: /Test Song/i }).first().tap()
    await expect(page.getByRole('button', { name: /clear song/i })).toBeVisible({ timeout: 15_000 })

    const lyric = 'Compose logo return line'
    await page.locator('textarea').first().fill(lyric)
    await expect(page.locator('.margo-moment-studio--calm')).toBeVisible({ timeout: 15_000 })

    const composeUrl = await page.evaluate(
      ({ lyric, song, artist }) => {
        const q = new URLSearchParams()
        q.set('lyric', lyric)
        q.set('song', song)
        q.set('artist', artist)
        q.set('phase', 'moment')
        return `/compose?${q.toString()}`
      },
      { lyric, song: 'Test Song', artist: 'Test Artist' },
    )
    await page.goto(`${BASE}${composeUrl}`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.margo-moment-studio--calm')).toBeVisible({ timeout: 20_000 })

    await clickLogoHome(page)

    await assertNoComposeHtmlAttrs(page)
    await assertCalmLandingIdle(page)
    await expect(page.locator('.margo-compose-search-shift')).toHaveCount(0)
  })
})
