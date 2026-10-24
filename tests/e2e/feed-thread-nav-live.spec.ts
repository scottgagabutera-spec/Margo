import { test, expect } from '@playwright/test'

/**
 * Live /feed + PrimaryTabShell navigation. Requires running app (PLAYWRIGHT_BASE_URL).
 * Skips when feed has no posts (empty Supabase) or auth redirect blocks feed.
 */
async function firstFeedPostId(page: import('@playwright/test').Page): Promise<string | null> {
  await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => {})
  const card = page.locator('.margo-post-card[id^="feed-post-"]').first()
  if (!(await card.waitFor({ state: 'visible', timeout: 45_000 }).catch(() => null))) return null
  const raw = await card.getAttribute('id')
  if (!raw?.startsWith('feed-post-')) return null
  return raw.slice('feed-post-'.length)
}

test.describe('live feed thread navigation @390', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
  })

  test('feed tab shell visible on /feed', async ({ page }) => {
    await page.goto('/feed', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/feed/)
    await expect(page.locator('[data-margo-primary-tab="feed"]')).toBeVisible({ timeout: 20_000 })
  })

  test('tap feed post opens /post/[id] thread', async ({ page }) => {
    await page.goto('/feed', { waitUntil: 'domcontentloaded' })
    const postId = await firstFeedPostId(page)
    test.skip(!postId, 'No feed posts visible — skip live nav test')
    const card = page.locator(`#feed-post-${CSS.escape(postId!)}`)
    await card.locator('.margo-post-card__body').click()
    await expect(page).toHaveURL(new RegExp(`/post/${postId}`), { timeout: 20_000 })
    await expect(page.locator('main')).toBeVisible()
  })

  test('tap Lyric Back row with panel closed opens thread', async ({ page }) => {
    await page.goto('/feed', { waitUntil: 'domcontentloaded' })
    const postId = await firstFeedPostId(page)
    test.skip(!postId, 'No feed posts visible')
    const card = page.locator(`#feed-post-${CSS.escape(postId!)}`)
    const lbBtn = card.getByRole('button', { name: /Lyric Back/i }).first()
    test.skip(!(await lbBtn.isVisible().catch(() => false)), 'No Lyric Back action on first post')
    const echoBadge = card.locator('.margo-feed-action__badge').first()
    test.skip(!(await echoBadge.isVisible().catch(() => false)), 'No Lyric Backs on first post')
    await lbBtn.click()
    await expect(card.locator('.margo-post-card__lb-panel')).toBeVisible({ timeout: 10_000 })
    const row = card.locator('[data-echo-id]').first()
    const echoId = await row.getAttribute('data-echo-id')
    test.skip(!echoId, 'No LB row in panel')
    await row.locator('.margo-lb-thread-row__lyric').click()
    await expect(page).toHaveURL(new RegExp(`/post/${echoId}`), { timeout: 20_000 })
    await expect(page.locator('main')).toBeVisible()
  })

  test('tap Lyric Back row with panel already open opens thread', async ({ page }) => {
    await page.goto('/feed', { waitUntil: 'domcontentloaded' })
    const postId = await firstFeedPostId(page)
    test.skip(!postId, 'No feed posts visible')
    const card = page.locator(`#feed-post-${CSS.escape(postId!)}`)
    const lbBtn = card.getByRole('button', { name: /Lyric Back/i }).first()
    test.skip(!(await lbBtn.isVisible().catch(() => false)), 'No Lyric Back action')
    await lbBtn.click()
    await expect(card.locator('.margo-post-card__lb-panel')).toBeVisible({ timeout: 10_000 })
    const row = card.locator('[data-echo-id]').first()
    const echoId = await row.getAttribute('data-echo-id')
    test.skip(!echoId, 'No LB row')
    await row.locator('.margo-lb-thread-row__lyric').click()
    await expect(page).toHaveURL(new RegExp(`/post/${echoId}`), { timeout: 20_000 })
    await page.goBack({ waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/feed/)
    await expect(card.locator('.margo-post-card__lb-panel')).toBeVisible({ timeout: 10_000 })
    await row.locator('.margo-lb-thread-row__lyric').click()
    await expect(page).toHaveURL(new RegExp(`/post/${echoId}`), { timeout: 20_000 })
  })
})
