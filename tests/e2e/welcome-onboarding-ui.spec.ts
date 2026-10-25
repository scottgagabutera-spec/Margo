import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

async function assertWelcomeContained(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-margo-welcome="ready"]') as HTMLElement | null
    if (!root) return { ok: false, reason: 'no welcome root' }
    const vw = document.documentElement.clientWidth
    const offenders: string[] = []
    root.querySelectorAll('input, button, a, h1, p, label, li').forEach((el) => {
      const box = el.getBoundingClientRect()
      if (box.width === 0 && box.height === 0) return
      if (box.left < -1 || box.right > vw + 1) offenders.push(el.tagName)
    })
    if (document.documentElement.scrollWidth > vw + 1) offenders.push('doc-horizontal')
    return { ok: offenders.length === 0, offenders, scrollLeft: document.documentElement.scrollLeft }
  })
}

for (const width of [360, 390] as const) {
  test.describe(`welcome onboarding UI @${width}px`, () => {
    test.use({ viewport: { width, height: 844 } })

    test('signed out opens auth gate shell', async ({ page }) => {
      await page.goto(`${BASE}/welcome?step=1`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(800)
      const signedOut = page.locator('[data-margo-welcome-state="signed-out"]')
      const ready = page.locator('[data-margo-welcome="ready"]')
      const gate = page.locator('[data-margo-auth-form], [role="dialog"]')
      const signedOutVisible = await signedOut.isVisible().catch(() => false)
      const readyVisible = await ready.isVisible().catch(() => false)
      expect(signedOutVisible || readyVisible || (await gate.count()) > 0).toBeTruthy()
      await expect(page.locator('.margo-mobile-tabbar')).toHaveCount(0)
      await expect(page.locator('[data-margo-auth-logo]')).toHaveCount(0)
    })

    test('step 1 continue gating and member username rejected', async ({ page }) => {
      await page.goto(`${BASE}/welcome?step=1`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(1000)
      const ready = page.locator('[data-margo-welcome="ready"]')
      if (!(await ready.isVisible().catch(() => false))) {
        test.skip(true, 'Sign-in required on preview for welcome wizard')
      }
      const cont = page.locator('[data-margo-welcome-continue]').first()
      await expect(cont).toBeDisabled()
      await page.locator('input[autocomplete="name"]').fill('Alex')
      await page.locator('input[autocomplete="username"]').fill('member123456789')
      await expect(page.getByText('Pick a personal username.')).toBeVisible({ timeout: 5000 })
      await expect(cont).toBeDisabled()
      await page.locator('input[autocomplete="username"]').fill('alexwelcome')
      await page.waitForTimeout(900)
      await expect(cont).toBeEnabled({ timeout: 15000 })
      const contained = await assertWelcomeContained(page)
      expect(contained.ok, JSON.stringify(contained)).toBeTruthy()
    })

    test('step 2 skip and step 3 feed link', async ({ page }) => {
      await page.goto(`${BASE}/welcome?step=2`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(1000)
      if (!(await page.locator('[data-margo-welcome="ready"]').isVisible().catch(() => false))) {
        test.skip(true, 'Sign-in required on preview for welcome wizard')
      }
      await expect(page.getByRole('heading', { name: 'Pick your vibe' })).toBeVisible()
      await page.getByRole('button', { name: 'Skip for now' }).click()
      await expect(page).toHaveURL(/step=3/)
      await expect(page.getByRole('heading', { name: 'Welcome to Margo' })).toBeVisible()
      await expect(page.locator('[data-margo-welcome-feed]')).toHaveAttribute('href', '/feed')
      await expect(page.locator('.margo-mobile-tabbar')).toHaveCount(0)
    })
  })
}
