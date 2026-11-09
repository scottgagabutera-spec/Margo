import { test, expect, type Page } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'

async function selectionAfterPointerDown(
  page: Page,
  href: '/feed' | '/discover' | '/compose',
): Promise<number> {
  return page.evaluate(async (path) => {
    const a = document.querySelector(`.margo-mobile-tabbar a[href="${path}"]`) as HTMLAnchorElement | null
    const bar = document.querySelector('.margo-mobile-tabbar')
    if (!a || !bar) return -1
    const want = path === '/feed' ? 'feed' : path === '/discover' ? 'discover' : 'compose'
    const start = performance.now()
    a.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        buttons: 1,
      }),
    )
    const deadline = start + 120
    while (performance.now() < deadline) {
      if (bar.getAttribute('data-margo-tab-selection') === want) {
        return Math.round(performance.now() - start)
      }
      await new Promise((r) => requestAnimationFrame(r))
    }
    return 999
  }, href)
}

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

const pairs: Array<{ from: string; href: '/feed' | '/discover' | '/compose'; want: string }> = [
  { from: '/feed', href: '/discover', want: 'discover' },
  { from: '/feed', href: '/compose', want: 'compose' },
  { from: '/discover', href: '/feed', want: 'feed' },
  { from: '/discover', href: '/compose', want: 'compose' },
  { from: '/compose', href: '/feed', want: 'feed' },
  { from: '/compose', href: '/discover', want: 'discover' },
]

for (const hop of pairs) {
  test(`tab selection ≤16ms after pointerdown: ${hop.from} → ${hop.want}`, async ({ page }) => {
    await page.goto(`${BASE}${hop.from}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.locator('.margo-mobile-tabbar')).toBeVisible({ timeout: 20_000 })
    const ms = await selectionAfterPointerDown(page, hop.href)
    expect(ms, `selection ms=${ms}`).toBeGreaterThanOrEqual(0)
    expect(ms).toBeLessThanOrEqual(16)
  })
}

test('feed lyrics sub tab ack on pointerdown', async ({ page }) => {
  await page.goto(`${BASE}/feed?tab=memories`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const ms = await page.evaluate(async () => {
    const btn = [...document.querySelectorAll('.margo-feed-content-tab')].find(
      (el) => el.textContent?.trim() === 'Lyrics',
    ) as HTMLButtonElement | undefined
    if (!btn) return -1
    const start = performance.now()
    btn.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 2, isPrimary: true }),
    )
    const deadline = start + 120
    while (performance.now() < deadline) {
      if (btn.getAttribute('data-margo-acked') === '1' || btn.classList.contains('margo-feed-content-tab--active')) {
        return Math.round(performance.now() - start)
      }
      await new Promise((r) => requestAnimationFrame(r))
    }
    return 999
  })
  expect(ms).toBeLessThanOrEqual(16)
})
