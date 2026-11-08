import { test, expect, type Page } from '@playwright/test'

type FeedPose = { tab: string; y: number; memX: number; shortsX: number }

const FEED_URL = '/feed?e2eShorts=1&e2eFeedReturn=1'

async function captureFeedPose(page: Page): Promise<FeedPose> {
  return page.evaluate(() => {
    const tab = new URLSearchParams(window.location.search).get('tab') || 'lyrics'
    const scroller = document.querySelector('[data-margo-primary-tab="feed"]')
    const y = scroller instanceof HTMLElement ? scroller.scrollTop : 0
    const mem = document.querySelector('.margo-feed-memories-row__scroller')
    const memX = mem instanceof HTMLElement ? mem.scrollLeft : 0
    const shorts = document.querySelector('.margo-feed-shorts-strip__row')
    const shortsX = shorts instanceof HTMLElement ? shorts.scrollLeft : 0
    return { tab, y, memX, shortsX }
  })
}

function assertPoseClose(a: FeedPose, b: FeedPose, opts?: { skipTab?: boolean; skipY?: boolean }) {
  if (!opts?.skipTab) expect(a.tab).toBe(b.tab)
  if (!opts?.skipY) expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(5)
  expect(Math.abs(a.memX - b.memX)).toBeLessThanOrEqual(5)
  expect(Math.abs(a.shortsX - b.shortsX)).toBeLessThanOrEqual(5)
}

async function prepFeed(page: Page): Promise<FeedPose> {
  await page.goto(FEED_URL, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-margo-primary-tab="feed"]')).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('[data-feed-exit="create-memory"]')).toBeVisible({ timeout: 30_000 })
  const scroller = page.locator('[data-margo-primary-tab="feed"]')
  await scroller.evaluate((el) => {
    el.scrollTop = 420
  })
  const mem = page.locator('.margo-feed-memories-row__scroller').first()
  if (await mem.count()) {
    await mem.evaluate((el) => {
      el.scrollLeft = 80
    })
  }
  const shorts = page.locator('.margo-feed-shorts-strip__row').first()
  if (await shorts.count()) {
    await shorts.evaluate((el) => {
      el.scrollLeft = 60
    })
  }
  await page.waitForTimeout(300)
  return captureFeedPose(page)
}

async function backChrome(page: Page) {
  const back = page.locator('button[aria-label="Back"]').first()
  if (await back.isVisible({ timeout: 3000 }).catch(() => false)) {
    await back.click()
    await page.waitForLoadState('domcontentloaded')
    return
  }
  await page.goBack({ waitUntil: 'domcontentloaded' })
}

async function restoreAndAssert(
  page: Page,
  before: FeedPose,
  back: 'chrome' | 'history',
  opts?: { skipTab?: boolean; skipY?: boolean },
) {
  if (back === 'chrome') await backChrome(page)
  else await page.goBack({ waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/feed/, { timeout: 25_000 })
  await expect(page.locator('[data-margo-primary-tab="feed"]')).toBeVisible({ timeout: 25_000 })
  if (!opts?.skipY) {
    await expect.poll(async () => {
      const pose = await captureFeedPose(page)
      return Math.abs(pose.y - before.y)
    }, { timeout: 8000 }).toBeLessThanOrEqual(5)
  }
  const after = await captureFeedPose(page)
  assertPoseClose(before, after, opts)
}

type ExitCase = {
  name: string
  locator: string
  note?: string
  skipY?: boolean
}

const EXITS: ExitCase[] = [
  { name: 'profile', locator: '.margo-post-card button' },
  { name: 'people', locator: '[data-feed-exit="people"] button' },
  { name: 'memory tile', locator: '.margo-feed-memory-row-tile' },
  { name: 'create memory', locator: '[data-feed-exit="create-memory"]' },
  { name: 'create pictures', locator: '[data-feed-exit="create-pictures"]' },
  { name: 'create story', locator: '[data-feed-exit="create-story"]' },
  { name: 'echoes chevron', locator: '[data-feed-exit="echoes-results"] button[aria-label="Open set"]' },
  { name: 'echoes person', locator: '[data-feed-exit="echoes-results"] .margo-feed-echoes-results__person-link' },
  { name: 'echoes song', locator: '[data-feed-exit="echoes-results"] .margo-echoes-song-strip__tile' },
  { name: 'shorts tile', locator: '.margo-feed-shorts-strip__tile' },
]

test.describe('feed return position signed out @390', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: 390, height: 844 })
  })

  for (const exit of EXITS) {
    test(`${exit.name} chrome back`, async ({ page }) => {
      const before = await prepFeed(page)
      const hit = page.locator(exit.locator).first()
      await expect(hit).toBeVisible({ timeout: 15_000 })
      await hit.click()
      await page.waitForTimeout(500)
      await restoreAndAssert(page, before, 'chrome', { skipY: exit.skipY })
    })

    test(`${exit.name} history back`, async ({ page }) => {
      const before = await prepFeed(page)
      const hit = page.locator(exit.locator).first()
      await expect(hit).toBeVisible({ timeout: 15_000 })
      await hit.click()
      await page.waitForTimeout(500)
      await restoreAndAssert(page, before, 'history', { skipY: exit.skipY })
    })
  }
})
