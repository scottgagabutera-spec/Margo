import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

async function assertWelcomeContained(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-margo-welcome="ready"], [data-margo-welcome="signed-out"]') as HTMLElement | null
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

async function expectStatusTokenColors(page: import('@playwright/test').Page) {
  const colors = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const successToken = root.getPropertyValue('--success').trim()
    const destructiveToken = root.getPropertyValue('--destructive').trim()
    const sample = (tone: 'success' | 'error') => {
      const wrap = document.createElement('div')
      wrap.className = `margo-welcome-status-line margo-welcome-status-line--${tone}`
      const text = document.createElement('span')
      text.className = 'margo-welcome-status-line__text'
      wrap.appendChild(text)
      document.body.appendChild(wrap)
      const computed = getComputedStyle(text).color
      wrap.remove()
      return computed
    }
    const bodyText = getComputedStyle(document.body).color
    return {
      successToken,
      destructiveToken,
      successText: sample('success'),
      errorText: sample('error'),
      bodyText,
    }
  })
  expect(colors.successToken.length).toBeGreaterThan(2)
  expect(colors.destructiveToken.length).toBeGreaterThan(2)
  expect(colors.successText).not.toBe(colors.bodyText)
  expect(colors.errorText).not.toBe(colors.bodyText)
}

async function skipIfWizardHidden(page: import('@playwright/test').Page) {
  const ready = page.locator('[data-margo-welcome="ready"]')
  if (!(await ready.isVisible().catch(() => false))) {
    test.skip(true, 'Sign-in required on preview for welcome wizard')
  }
}

for (const width of [360, 390] as const) {
  test.describe(`welcome onboarding UI @${width}px`, () => {
    test.use({ viewport: { width, height: 844 } })

    test('auth screens have no Help link', async ({ page }) => {
      for (const path of ['/signin', '/forgot-password', '/reset-password']) {
        await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
        await expect(page.getByRole('link', { name: 'Help' })).toHaveCount(0)
      }
    })

    test('success and error status lines use semantic tokens', async ({ page }) => {
      await page.goto(`${BASE}/welcome?step=1`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await expect(page.locator('[data-margo-welcome="loading"]')).toHaveCount(0, { timeout: 20000 })
      await expectStatusTokenColors(page)
    })

    test('signed out shell, no tab bar, no Help', async ({ page }) => {
      await page.goto(`${BASE}/welcome?step=1`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await expect(page.locator('[data-margo-welcome="loading"]')).toHaveCount(0, { timeout: 20000 })
      await expect(
        page.locator('[data-margo-welcome-state="signed-out"], [data-margo-welcome="ready"]'),
      ).toHaveCount(1, { timeout: 10000 })
      await expect(page.locator('.margo-mobile-tabbar')).toHaveCount(0)
      await expect(page.locator('[data-margo-auth-logo]')).toHaveCount(0)
      await expect(page.getByRole('link', { name: 'Help' })).toHaveCount(0)
    })

    test('four steps, back keeps data, step 1 gating, step 3 skip', async ({ page }) => {
      await page.goto(`${BASE}/welcome?step=1`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await skipIfWizardHidden(page)
      await expect(page.locator('[data-margo-welcome-step="1"]')).toBeVisible()
      await page.getByRole('button', { name: 'Next' }).click()
      await expect(page.getByText('Enter your name.')).toBeVisible()
      await page.locator('input[autocomplete="name"]').fill('Alex')
      await page.locator('input[autocomplete="username"]').fill('member123456789')
      await page.getByRole('button', { name: 'Next' }).click()
      await expect(page.getByText('Pick a personal username.')).toBeVisible()
      const handle = `alexw${Date.now().toString().slice(-7)}`
      await page.locator('input[autocomplete="username"]').fill(handle)
      await page.waitForTimeout(1200)
      await expect(page.locator('[data-margo-welcome-status="username-available"]')).toBeVisible({ timeout: 15000 })
      const availableColor = await page.locator('[data-margo-welcome-status="username-available"] .margo-welcome-status-line__text').evaluate((el) => getComputedStyle(el).color)
      const bodyColor = await page.locator('body').evaluate((el) => getComputedStyle(el).color)
      expect(availableColor).not.toBe(bodyColor)
      await page.getByRole('button', { name: 'Next' }).click()
      await expect(page).toHaveURL(/step=2/)
      await expect(page.getByRole('heading', { name: 'Add your photos' })).toBeVisible()
      await page.getByRole('button', { name: 'Back' }).click()
      await expect(page).toHaveURL(/step=1/)
      await expect(page.locator('input[autocomplete="name"]')).toHaveValue('Alex')
      await page.getByRole('button', { name: 'Next' }).click()
      await expect(page).toHaveURL(/step=2/)
      await page.getByRole('button', { name: 'Skip for now' }).click()
      await expect(page).toHaveURL(/step=3/)
      await page.getByRole('button', { name: 'Skip for now' }).click()
      await expect(page).toHaveURL(/step=4/)
      await expect(page.getByRole('heading', { name: /You.re in/ })).toBeVisible()
      const contained = await assertWelcomeContained(page)
      expect(contained.ok, JSON.stringify(contained)).toBeTruthy()
    })

    test('step 2 photo picker opens from avatar and cover', async ({ page }) => {
      await page.goto(`${BASE}/welcome?step=2`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await skipIfWizardHidden(page)
      await page.locator('[data-margo-welcome-avatar]').click()
      await expect(page.getByRole('button', { name: 'Take photo' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Choose from gallery' })).toBeVisible()
      await page.getByRole('button', { name: 'Cancel' }).click()
      await page.locator('[data-margo-welcome-cover]').click()
      await expect(page.getByRole('button', { name: 'Take photo' })).toBeVisible()
    })

    test('step 3 chip gating message', async ({ page }) => {
      await page.goto(`${BASE}/welcome?step=3`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await skipIfWizardHidden(page)
      await expect(page.locator('[data-margo-welcome-status="vibes-hint"]')).toContainText('Pick 3 to continue')
      await page.getByRole('button', { name: 'Chill' }).click()
      await expect(page.locator('[data-margo-welcome-status="vibes-hint"]')).toContainText('2 more to go')
      await page.getByRole('button', { name: 'Hope' }).click()
      await expect(page.locator('[data-margo-welcome-status="vibes-hint"]')).toContainText('1 more to go')
      await page.getByRole('button', { name: 'Love' }).click()
      await expect(page.locator('[data-margo-welcome-status="vibes-success"]')).toContainText('3 chosen')
      const chosenColor = await page.locator('[data-margo-welcome-status="vibes-success"] .margo-welcome-status-line__text').evaluate((el) => getComputedStyle(el).color)
      const bodyColor = await page.locator('body').evaluate((el) => getComputedStyle(el).color)
      expect(chosenColor).not.toBe(bodyColor)
      await page.getByRole('button', { name: 'Next' }).click()
      await expect(page).toHaveURL(/step=4/)
    })

    test('step 3 chip gating error on Next', async ({ page }) => {
      await page.goto(`${BASE}/welcome?step=3`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await skipIfWizardHidden(page)
      await page.getByRole('button', { name: 'Next' }).click()
      await expect(page.locator('[data-margo-welcome-status="vibes-error"]')).toBeVisible()
    })

    test('step 4 cards follow role preference', async ({ page }) => {
      await page.goto(`${BASE}/welcome?step=3`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await skipIfWizardHidden(page)
      await page.locator('[data-margo-welcome-role="artist"]').click()
      await page.getByRole('button', { name: 'Skip for now' }).click()
      await expect(page).toHaveURL(/step=4/)
      await expect(page.locator('[data-margo-welcome-step4-card="apply-artist"]')).toBeVisible()
      await expect(page.locator('[data-margo-welcome-step4-card="complete-profile"]')).toBeVisible()
      expect(await page.locator('[data-margo-welcome-step4-card]').count()).toBeLessThanOrEqual(4)
    })

    test('footer back inline and step 4 feed button', async ({ page }) => {
      await page.goto(`${BASE}/welcome?step=4`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await skipIfWizardHidden(page)
      await expect(page.locator('.margo-welcome-footer__row--step4')).toBeVisible()
      await expect(page.locator('.margo-welcome-back-btn')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Go to Feed' })).toBeVisible()
    })
  })
}

for (const width of [320, 768, 1280] as const) {
  test(`welcome no horizontal overflow @${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width >= 768 ? 900 : 700 })
    await page.goto(`${BASE}/welcome?step=1`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await expect(page.locator('[data-margo-welcome="loading"]')).toHaveCount(0, { timeout: 20000 })
    await expect(
      page.locator('[data-margo-welcome="ready"], [data-margo-welcome="signed-out"]'),
    ).toHaveCount(1, { timeout: 15000 })
    const contained = await assertWelcomeContained(page)
    expect(contained.ok, JSON.stringify(contained)).toBeTruthy()
  })
}
