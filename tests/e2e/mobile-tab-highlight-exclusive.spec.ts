import { test, expect, type Page } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'
const GOLD = 'rgb(232, 197, 71)'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

async function tabLabelColor(page: Page, label: 'Feed' | 'Discover' | 'Hub' | 'Sign In') {
  if (label === 'Hub') {
    const el = page.getByRole('button', { name: /^Hub/i }).locator('span').last()
    return el.evaluate((node) => getComputedStyle(node).color)
  }
  if (label === 'Sign In') {
    const el = page.locator('.margo-mobile-tabbar a[href*="/signin"] span').last()
    return el.evaluate((node) => getComputedStyle(node).color)
  }
  const el = page.locator('.margo-mobile-tabbar').getByRole('link', { name: label }).locator('span').last()
  return el.evaluate((node) => getComputedStyle(node).color)
}

async function assertSingleGold(page: Page, owner: 'Feed' | 'Discover' | 'Hub' | 'Sign In') {
  const colors = {
    feed: await tabLabelColor(page, 'Feed'),
    discover: await tabLabelColor(page, 'Discover'),
    hub: await tabLabelColor(page, 'Hub'),
    signIn: await tabLabelColor(page, 'Sign In'),
  }
  const goldTabs = (['feed', 'discover', 'hub', 'signIn'] as const).filter((k) => colors[k] === GOLD)
  expect(goldTabs.length, JSON.stringify(colors)).toBeLessThanOrEqual(1)
  const key = owner === 'Sign In' ? 'signIn' : owner.toLowerCase() as 'feed' | 'discover' | 'hub'
  expect(colors[key]).toBe(GOLD)
}

const hops: Array<{ from: string; to: 'Feed' | 'Discover' | 'Hub' | 'Sign In'; owner: 'Feed' | 'Discover' | 'Hub' | 'Sign In' }> = [
  { from: '/feed', to: 'Hub', owner: 'Hub' },
  { from: '/feed', to: 'Feed', owner: 'Feed' },
  { from: '/feed', to: 'Discover', owner: 'Discover' },
  { from: '/discover', to: 'Feed', owner: 'Feed' },
  { from: '/discover', to: 'Hub', owner: 'Hub' },
  { from: '/discover', to: 'Discover', owner: 'Discover' },
  { from: '/compose', to: 'Feed', owner: 'Feed' },
  { from: '/feed', to: 'Sign In', owner: 'Sign In' },
]

for (const hop of hops) {
  test(`exclusive gold: ${hop.from} → ${hop.to}`, async ({ page }) => {
    await page.goto(`${BASE}${hop.from}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.locator('.margo-mobile-tabbar')).toBeVisible({ timeout: 20000 })

    if (hop.to === 'Hub') {
      await page.getByRole('button', { name: /^Hub/i }).tap()
    } else if (hop.to === 'Sign In') {
      await page.locator('.margo-mobile-tabbar a[href*="/signin"]').tap()
    } else {
      await page.locator('.margo-mobile-tabbar').getByRole('link', { name: hop.to }).tap()
    }

    await assertSingleGold(page, hop.owner)
  })
}

test('hub → feed: only Feed gold after tap', async ({ page }) => {
  await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.getByRole('button', { name: /^Hub/i }).tap()
  await assertSingleGold(page, 'Hub')
  await page.locator('.margo-mobile-tabbar a[href="/feed"]').tap()
  await expect(page.getByRole('dialog', { name: 'Hub' })).toHaveCount(0)
  await assertSingleGold(page, 'Feed')
})
