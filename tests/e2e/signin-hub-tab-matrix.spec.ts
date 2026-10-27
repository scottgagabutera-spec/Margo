import { test, expect, type Page } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'

type Surface = 'landing' | 'feed' | 'discover' | 'hub' | 'signin'

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
})

async function waitTabBar(page: Page) {
  await expect(page.locator('.margo-mobile-tabbar')).toBeVisible({ timeout: 20000 })
}

async function goSurface(page: Page, surface: Surface) {
  if (surface === 'landing') {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('html[data-margo-stage-client-ready]', { timeout: 20000 }).catch(() => {})
    return
  }
  if (surface === 'feed') {
    await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    return
  }
  if (surface === 'discover') {
    await page.goto(`${BASE}/discover`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    return
  }
  if (surface === 'signin') {
    await page.goto(`${BASE}/signin?returnTo=%2Ffeed`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    return
  }
  if (surface === 'hub') {
    await goSurface(page, 'feed')
    await tapHub(page)
    return
  }
}

async function tapHub(page: Page) {
  await page.getByRole('button', { name: /^Hub/i }).tap()
}

async function tapTab(page: Page, label: 'Feed' | 'Discover' | 'Sign In') {
  if (label === 'Sign In') {
    await page.locator('.margo-mobile-tabbar a[href*="/signin"]').tap()
    return
  }
  await page.locator('.margo-mobile-tabbar').getByRole('link', { name: label }).tap()
}

async function assertSurface(page: Page, surface: Surface) {
  if (surface === 'hub') {
    await expect(page.getByRole('dialog', { name: 'Hub' })).toBeVisible()
    return
  }
  await expect(page.getByRole('dialog', { name: 'Hub' })).toHaveCount(0)
  const path = surface === 'landing' ? '/' : surface === 'signin' ? '/signin' : `/${surface}`
  await expect(page).toHaveURL(new RegExp(`${path.replace('/', '\\/')}`))
}

async function assertTabHighlight(page: Page, surface: Surface) {
  if (surface === 'hub') {
    await expect(page.getByRole('button', { name: /^Hub/i })).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('.margo-mobile-tabbar a[href*="/signin"]')).not.toHaveAttribute('aria-current', 'page')
    return
  }
  if (surface === 'signin') {
    await expect(page.locator('.margo-mobile-tabbar a[href*="/signin"]')).toHaveAttribute('aria-current', 'page')
    return
  }
  if (surface === 'feed') {
    await expect(page.locator('.margo-mobile-tabbar a[href="/feed"]')).toBeVisible()
  }
}

const surfaces: Surface[] = ['landing', 'feed', 'discover', 'hub', 'signin']

for (const from of surfaces) {
  for (const to of surfaces) {
    if (from === to) continue
    test(`${from} → ${to} @390 touch`, async ({ page }) => {
      await goSurface(page, from)
      await waitTabBar(page)

      if (to === 'feed') await tapTab(page, 'Feed')
      else if (to === 'discover') await tapTab(page, 'Discover')
      else if (to === 'signin') await tapTab(page, 'Sign In')
      else if (to === 'hub') await tapHub(page)
      else if (to === 'landing') await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })

      await assertSurface(page, to)
      if (to === 'hub' || to === 'signin') await assertTabHighlight(page, to)
    })
  }
}

test('signin → Hub → Back returns to feed', async ({ page }) => {
  await goSurface(page, 'signin')
  await waitTabBar(page)
  await tapHub(page)
  await expect(page.getByRole('dialog', { name: 'Hub' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/feed/)
})

test('feed → signin → Hub stays on signin under sheet', async ({ page }) => {
  await goSurface(page, 'feed')
  await waitTabBar(page)
  await tapTab(page, 'Sign In')
  await expect(page).toHaveURL(/\/signin/)
  await tapHub(page)
  await expect(page.getByRole('dialog', { name: 'Hub' })).toBeVisible()
  await expect(page).toHaveURL(/\/signin/)
})
