import { test, expect, type Page } from '@playwright/test'

type FeedPose = { tab: string; y: number; memX: number; shortsX: number }

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

function assertPoseClose(a: FeedPose, b: FeedPose) {
  expect(a.tab).toBe(b.tab)
  expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(5)
  expect(Math.abs(a.memX - b.memX)).toBeLessThanOrEqual(5)
  expect(Math.abs(a.shortsX - b.shortsX)).toBeLessThanOrEqual(5)
}

async function prepFeed(page: Page): Promise<FeedPose> {
  await page.goto('/feed?e2eShorts=1', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-margo-primary-tab="feed"]')).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.margo-post-card').first()).toBeVisible({ timeout: 90_000 })
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
  await page.waitForTimeout(250)
  return captureFeedPose(page)
}

async function backChrome(page: Page) {
  const back = page.locator('a[aria-label="Back"], button[aria-label="Back"]').first()
  if (await back.isVisible().catch(() => false)) await back.click()
  else await page.goBack({ waitUntil: 'domcontentloaded' })
}

async function restoreAndAssert(page: Page, before: FeedPose, back: 'chrome' | 'history') {
  if (back === 'chrome') await backChrome(page)
  else await page.goBack({ waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/feed/, { timeout: 20_000 })
  await expect(page.locator('[data-margo-primary-tab="feed"]')).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(400)
  const after = await captureFeedPose(page)
  assertPoseClose(before, after)
}

test.describe('feed return position signed out @390', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 390, height: 844 })
  })

  test('profile from post chrome back', async ({ page }) => {
    const before = await prepFeed(page)
    const profile = page.locator('.margo-post-card a[href^="/profile/"]').first()
    await expect(profile).toBeVisible({ timeout: 10_000 })
    await profile.click()
    await page.waitForTimeout(500)
    await restoreAndAssert(page, before, 'chrome')
  })

  test('profile from post history back', async ({ page }) => {
    const before = await prepFeed(page)
    const profile = page.locator('.margo-post-card a[href^="/profile/"]').first()
    await profile.click()
    await page.waitForTimeout(500)
    await restoreAndAssert(page, before, 'history')
  })

  test('who to follow chrome back', async ({ page }) => {
    const before = await prepFeed(page)
    const hit = page.locator('[data-feed-exit="people"] button, [data-feed-exit="people"] a').first()
    test.skip(!(await hit.count()), 'no who to follow block')
    await hit.click()
    await page.waitForTimeout(500)
    await restoreAndAssert(page, before, 'chrome')
  })

  test('who to follow history back', async ({ page }) => {
    const before = await prepFeed(page)
    const hit = page.locator('[data-feed-exit="people"] button').first()
    test.skip(!(await hit.count()), 'no who to follow block')
    await hit.click()
    await page.waitForTimeout(500)
    await restoreAndAssert(page, before, 'history')
  })

  test('memory tile chrome back', async ({ page }) => {
    const before = await prepFeed(page)
    const tile = page.locator('.margo-feed-memory-row-tile').first()
    test.skip(!(await tile.count()), 'no memory tile')
    await tile.click()
    await page.waitForTimeout(500)
    await restoreAndAssert(page, before, 'chrome')
  })

  test('memory tile history back', async ({ page }) => {
    const before = await prepFeed(page)
    const tile = page.locator('.margo-feed-memory-row-tile').first()
    test.skip(!(await tile.count()), 'no memory tile')
    await tile.click()
    await restoreAndAssert(page, before, 'history')
  })

  test('shorts strip chrome back', async ({ page }) => {
    const before = await prepFeed(page)
    const tile = page.locator('.margo-feed-shorts-strip__tile').first()
    test.skip(!(await tile.count()), 'no shorts strip')
    await tile.click()
    await page.waitForTimeout(500)
    if (!page.url().includes('/feed')) await backChrome(page)
    else await page.locator('[data-margo-nav-back], button[aria-label="Back"]').first().click().catch(() => {})
    await expect(page).toHaveURL(/\/feed/, { timeout: 20_000 })
    await page.waitForTimeout(400)
    assertPoseClose(before, await captureFeedPose(page))
  })

  test('echoes set chrome back', async ({ page }) => {
    const before = await prepFeed(page)
    const open = page.locator('[data-feed-exit="echoes-results"] button[aria-label="Open set"]').first()
    test.skip(!(await open.count()), 'no echoes results')
    await open.click()
    await page.waitForTimeout(500)
    await restoreAndAssert(page, before, 'chrome')
  })

  test('echoes set history back', async ({ page }) => {
    const before = await prepFeed(page)
    const open = page.locator('[data-feed-exit="echoes-results"] button[aria-label="Open set"]').first()
    test.skip(!(await open.count()), 'no echoes results')
    await open.click()
    await restoreAndAssert(page, before, 'history')
  })

  test('story overlay close', async ({ page }) => {
    const before = await prepFeed(page)
    const story = page.locator('.margo-stories-dock button, .margo-story-ring-tray button').first()
    test.skip(!(await story.count()), 'no story control')
    await story.click()
    await page.waitForTimeout(400)
    const close = page.getByRole('button', { name: /Close/i }).first()
    if (await close.isVisible().catch(() => false)) await close.click()
    else await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    assertPoseClose(before, await captureFeedPose(page))
  })
})
