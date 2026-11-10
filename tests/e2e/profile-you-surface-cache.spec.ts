import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

test.describe('profile you surface cache @signed-in-required', () => {
  test('second /you visit within 60s: no surface refetch, no memory skeleton', async ({ page }) => {
    test.skip(!process.env.PLAYWRIGHT_SIGNED_IN, 'Set PLAYWRIGHT_SIGNED_IN=1 with an authenticated storage project')

    let surfaceCalls = 0
    await page.route('**/api/profile/surface**', async (route) => {
      surfaceCalls += 1
      await route.continue()
    })
    let memoriesCalls = 0
    await page.route('**/api/memories?**', async (route) => {
      memoriesCalls += 1
      await route.continue()
    })

    await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.goto(`${BASE}/you`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.locator('[data-testid="profile-hero-cluster"]').first()).toBeVisible({ timeout: 30000 })
    await page.waitForTimeout(800)
    const firstSurface = surfaceCalls

    await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded' })
    await page.goto(`${BASE}/you`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.locator('[data-testid="profile-hero-cluster"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.margo-profile-memory-tile--skeleton')).toHaveCount(0)

    expect(memoriesCalls).toBe(0)
    expect(surfaceCalls).toBe(firstSurface)
  })
})
