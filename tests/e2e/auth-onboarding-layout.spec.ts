import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

async function assertAuthScreenContained(page: import('@playwright/test').Page, selector: string) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel) as HTMLElement | null
    if (!root) return { ok: false, reason: 'missing root' }
    const vw = document.documentElement.clientWidth
    const offenders: string[] = []
    root.querySelectorAll('input, button, a, h1, p, label').forEach((el) => {
      const box = el.getBoundingClientRect()
      if (box.width === 0 && box.height === 0) return
      if (box.left < -1 || box.right > vw + 1) offenders.push(el.tagName)
    })
    if (document.documentElement.scrollWidth > vw + 1) offenders.push('doc-horizontal')
    return { ok: offenders.length === 0, offenders, scrollLeft: document.documentElement.scrollLeft }
  }, selector)
}

for (const width of [360, 390, 834, 1440]) {
  test.describe(`auth onboarding layout @${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('forgot-password screen containment', async ({ page }) => {
      await page.goto(`${BASE}/forgot-password`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      const main = '[data-margo-auth-screen="forgot-password"]'
      await expect(page.locator(main)).toBeVisible({ timeout: 15000 })
      const email = page.locator('input[type="email"]')
      await expect(email).toBeVisible()
      const box = await email.boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
      const contained = await assertAuthScreenContained(page, main)
      expect(contained.ok, JSON.stringify(contained)).toBeTruthy()
      expect(contained.scrollLeft).toBe(0)
    })

    test('reset-password screen containment', async ({ page }) => {
      await page.goto(`${BASE}/reset-password`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      const main = '[data-margo-auth-screen="reset-password"]'
      await expect(page.locator(main)).toBeVisible({ timeout: 15000 })
      const contained = await assertAuthScreenContained(page, main)
      expect(contained.ok, JSON.stringify(contained)).toBeTruthy()
    })

    test('sign-up first view three buttons', async ({ page }) => {
      await page.goto(`${BASE}/signin?mode=signup`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(600)
      await expect(page.locator('[data-margo-auth-email-open="0"]')).toBeVisible({ timeout: 15000 })
      await expect(page.locator('[data-margo-auth-email-form]')).toHaveCount(0)
      await expect(page.locator('.margo-consent-gate')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible({ timeout: 15000 })
      await expect(page.getByRole('button', { name: 'Continue with Discord' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Continue with email' })).toBeVisible()
      for (const name of ['Continue with Google', 'Continue with Discord', 'Continue with email']) {
        const box = await page.getByRole('button', { name }).boundingBox()
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
      }
    })

    test('inline email form and password hint', async ({ page }) => {
      await page.goto(`${BASE}/signin?mode=signup`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.getByRole('button', { name: 'Continue with email' }).click()
      await expect(page.locator('[data-margo-auth-email-form]')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/letter & number/i)).toBeVisible()
    })

    test('sign-in forgot link tap target', async ({ page }) => {
      await page.goto(`${BASE}/signin?mode=signin`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.getByRole('button', { name: 'Continue with email' }).click()
      const link = page.getByRole('link', { name: 'Forgot password?' })
      await expect(link).toBeVisible({ timeout: 15000 })
      const box = await link.boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    })

    test('profile edit gate + welcome query containment', async ({ page }) => {
      await page.goto(`${BASE}/profile/edit?welcome=1`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(800)
      const main = page.locator('main')
      await expect(main).toBeVisible()
      const contained = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth
        const mainEl = document.querySelector('main')
        if (!mainEl) return { ok: false }
        const box = mainEl.getBoundingClientRect()
        return {
          ok: box.left >= -1 && box.right <= vw + 1 && document.documentElement.scrollLeft === 0,
          scrollWidth: document.documentElement.scrollWidth,
          vw,
        }
      })
      expect(contained.ok, JSON.stringify(contained)).toBeTruthy()
    })
  })
}

test('username status line fixture stays inside parent @360', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.setContent(`
    <div id="wrap" style="width:100%;max-width:420px;padding:16px;box-sizing:border-box;overflow:hidden">
      <div style="position:relative;width:100%">
        <input style="width:100%;height:44px;box-sizing:border-box" />
      </div>
      <p data-margo-username-status="available" style="min-height:18px;margin:8px 0 0;font-size:12px">Available</p>
    </div>
  `)
  const ok = await page.evaluate(() => {
    const wrap = document.getElementById('wrap')!
    const status = document.querySelector('[data-margo-username-status]')!
    const wb = wrap.getBoundingClientRect()
    const sb = status.getBoundingClientRect()
    return sb.left >= wb.left && sb.right <= wb.right + 1
  })
  expect(ok).toBe(true)
})
