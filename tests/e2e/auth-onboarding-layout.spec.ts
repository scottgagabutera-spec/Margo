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

    test('reset-password code state containment', async ({ page }) => {
      await page.goto(`${BASE}/reset-password`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      const main = '[data-margo-auth-screen="reset-password"]'
      await expect(page.locator(main)).toBeVisible({ timeout: 15000 })
      await expect(page.locator('[data-margo-reset-state="code"]')).toBeVisible({ timeout: 15000 })
      const contained = await assertAuthScreenContained(page, main)
      expect(contained.ok, JSON.stringify(contained)).toBeTruthy()
    })

    test('reset-password url error state containment', async ({ page }) => {
      await page.goto(`${BASE}/reset-password?error=access_denied&error_code=otp_expired`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await expect(page.locator('[data-margo-reset-state="url_error"]')).toBeVisible({ timeout: 15000 })
      await expect(page.locator('[data-margo-reset-state="url_error"] [role="alert"]').first()).toContainText('expired')
      const main = '[data-margo-auth-screen="reset-password"]'
      const contained = await assertAuthScreenContained(page, main)
      expect(contained.ok, JSON.stringify(contained)).toBeTruthy()
    })

    test('sign-up opens on email form with icon social row', async ({ page }) => {
      if (width !== 360 && width !== 390) return
      await page.goto(`${BASE}/signin?mode=signup`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(600)
      await expect(page.locator('[data-margo-auth-email-open="1"]')).toBeVisible({ timeout: 15000 })
      await expect(page.locator('[data-margo-auth-email-form]')).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Continue with email' })).toHaveCount(0)
      await expect(page.locator('[role="tablist"]')).toHaveCount(0)
      for (const name of ['Continue with Google', 'Continue with Discord']) {
        const btn = page.getByRole('button', { name })
        await expect(btn).toBeVisible({ timeout: 15000 })
        const box = await btn.boundingBox()
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
      }
      const contained = await assertAuthScreenContained(page, '[data-margo-auth-form]')
      expect(contained.ok, JSON.stringify(contained)).toBeTruthy()
    })

    test('inline email form and password hint', async ({ page }) => {
      if (width !== 360 && width !== 390) return
      await page.goto(`${BASE}/signin?mode=signup`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await expect(page.locator('[data-margo-auth-email-form]')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/letter & number/i)).toBeVisible()
    })

    test('sign-in forgot link tap target', async ({ page }) => {
      if (width !== 360 && width !== 390) return
      await page.goto(`${BASE}/signin?mode=signin`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await expect(page.locator('[data-margo-auth-email-form]')).toBeVisible({ timeout: 15000 })
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

test('sign-in failure shows neutral line and resend without code leak @360', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Incorrect email or password.' }),
    })
  })
  await page.goto(`${BASE}/signin?mode=signin`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await expect(page.locator('[data-margo-auth-email-form]')).toBeVisible({ timeout: 15000 })
  await page.locator('input[type="email"]').fill('someone@example.com')
  await page.locator('input[type="password"]').fill('wrong-password-1')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.locator('[data-margo-auth-email-form] [role="alert"]').first()).toContainText('Incorrect email or password')
  await expect(page.getByRole('button', { name: 'Resend confirmation email' })).toBeVisible()
})

for (const width of [360, 390]) {
  test.describe(`auth polish @${width}px`, () => {
    test.use({ viewport: { width, height: 800 } })

    test('no auth logo on sign-in, forgot, reset', async ({ page }) => {
      for (const path of ['/signin', '/forgot-password', '/reset-password']) {
        await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
        await expect(page.locator('[data-margo-auth-logo]')).toHaveCount(0)
      }
    })

    test('forgot password send code copy', async ({ page }) => {
      await page.goto(`${BASE}/forgot-password`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await expect(page.getByRole('button', { name: 'Send code' })).toBeVisible()
      await expect(page.getByText('Email used for your account.')).toBeVisible()
    })

    test('reset link query still opens code-first', async ({ page }) => {
      await page.goto(`${BASE}/reset-password?token_hash=fakehash&type=recovery`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await expect(page.locator('[data-margo-reset-state="code"]')).toBeVisible({ timeout: 15000 })
      await expect(page.getByRole('button', { name: 'Use email link instead' })).toBeVisible()
    })

    test('password confirm labels fixture', async ({ page }) => {
      await page.setContent(`
        <div style="width:100%;max-width:420px;padding:16px;box-sizing:border-box">
          <label>New password</label>
          <input type="password" aria-label="New password" style="width:100%;height:44px;box-sizing:border-box" />
          <label>Confirm new password</label>
          <input type="password" aria-label="Confirm new password" style="width:100%;height:44px;box-sizing:border-box;margin-top:8px" />
        </div>
      `)
      await expect(page.getByLabel('Confirm new password')).toBeVisible()
      const ok = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth
        const el = document.querySelector('[aria-label="Confirm new password"]') as HTMLElement | null
        if (!el) return false
        const r = el.getBoundingClientRect()
        return r.left >= 0 && r.right <= vw + 1
      })
      expect(ok).toBe(true)
    })
  })
}

for (const [w, h] of [[360, 640], [390, 844]] as const) {
  test(`reset code form stays in viewport with keyboard inset @${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    await page.goto(`${BASE}/reset-password`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await expect(page.locator('[data-margo-reset-state="code"]')).toBeVisible({ timeout: 15000 })
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--auth-keyboard-inset', '280px')
    })
    const verify = page.locator('[data-margo-reset-verify-code]')
    await expect(verify).toBeVisible()
    const ok = await page.evaluate(() => {
      const btn = document.querySelector('[data-margo-reset-verify-code]') as HTMLElement | null
      if (!btn) return { ok: false, reason: 'no verify' }
      btn.scrollIntoView({ block: 'end', behavior: 'instant' })
      const r = btn.getBoundingClientRect()
      const vh = window.innerHeight
      return { ok: r.top >= 0 && r.bottom <= vh + 1, top: r.top, bottom: r.bottom, vh }
    })
    expect(ok.ok, JSON.stringify(ok)).toBeTruthy()
  })

  test(`auth email form stays in viewport with keyboard inset @${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    await page.goto(`${BASE}/signin?mode=signin`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await expect(page.locator('[data-margo-auth-email-form]')).toBeVisible({ timeout: 15000 })
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--auth-keyboard-inset', '280px')
    })
    const submit = page.getByRole('button', { name: 'Sign in' })
    await expect(submit).toBeVisible()
    const ok = await page.evaluate(() => {
      const btn = document.querySelector('[data-margo-auth-submit]') as HTMLElement | null
      if (!btn) return { ok: false, reason: 'no submit' }
      btn.scrollIntoView({ block: 'end', behavior: 'instant' })
      const r = btn.getBoundingClientRect()
      const vh = window.innerHeight
      return { ok: r.top >= 0 && r.bottom <= vh + 1, top: r.top, bottom: r.bottom, vh }
    })
    expect(ok.ok, JSON.stringify(ok)).toBeTruthy()
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
