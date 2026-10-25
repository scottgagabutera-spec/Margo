import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

const MAIN_NAME_PX = 0.95 * 16
const MAIN_HANDLE_PX = 0.7 * 16

async function openProfile(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  const link = page.locator('a[href^="/profile/"]').first()
  await expect(link).toBeVisible({ timeout: 25000 })
  await link.click()
  await page.waitForURL(/\/profile\//, { timeout: 15000 })
  await expect(page.locator('[data-testid="profile-portrait-hero"]').first()).toBeVisible({ timeout: 20000 })
  await page.waitForTimeout(400)
}

for (const width of [360, 390, 834, 1440]) {
  test.describe(`profile portrait hero @${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('portrait visible on cover, centred identity, tight handle gap', async ({ page }) => {
      await openProfile(page)
      const hero = page.locator('[data-testid="profile-portrait-hero"]').first()
      if ((await hero.count()) === 0) test.skip(true, 'Portrait profile hero not deployed')
      await expect(hero).toBeVisible()

      const layout = await page.evaluate(() => {
        const heroEl = document.querySelector('[data-testid="profile-portrait-hero"]') as HTMLElement | null
        const frame = document.querySelector('[data-testid="profile-portrait-photo"] .margo-portrait-avatar__frame') as HTMLElement | null
        const cover = document.querySelector('.margo-profile-cover') as HTMLElement | null
        const identity = document.querySelector('[data-testid="profile-identity-block"]') as HTMLElement | null
        const name = document.querySelector('.margo-profile-identity__name') as HTMLElement | null
        const handle = document.querySelector('.margo-profile-identity__handle') as HTMLElement | null
        const stats = document.querySelector('.margo-profile-sheet')?.querySelector('a[href*="followers"]')?.parentElement as HTMLElement | null

        const fr = frame?.getBoundingClientRect()
        const cr = cover?.getBoundingClientRect()
        const ir = identity?.getBoundingClientRect()
        const nr = name?.getBoundingClientRect()
        const hr = handle?.getBoundingClientRect()
        const sr = stats?.getBoundingClientRect()

        const nameFs = name ? parseFloat(getComputedStyle(name).fontSize) : null
        const handleFs = handle ? parseFloat(getComputedStyle(handle).fontSize) : null
        const nameHandleGap = nr && hr ? hr.top - nr.bottom : null

        const roleSlot = document.querySelector('[data-testid="profile-author-role-slot"]') as HTMLElement | null
        const thirdSlot = document.querySelector('[data-testid="profile-role-third-slot"]') as HTMLElement | null

        const coverBottom = cr?.bottom ?? null
        const portraitTop = fr?.top ?? null
        const portraitVisibleAboveCover =
          coverBottom != null && portraitTop != null
            ? coverBottom - portraitTop >= (fr?.height ?? 0) * 0.45
            : null

        const heroCenter = heroEl ? heroEl.getBoundingClientRect().left + heroEl.getBoundingClientRect().width / 2 : null
        const frameCenter = fr ? fr.left + fr.width / 2 : null

        return {
          viewportW: document.documentElement.clientWidth,
          portraitTop,
          portraitBottom: fr?.bottom,
          coverBottom,
          portraitVisibleAboveCover,
          nameHandleGap,
          nameFs,
          handleFs,
          centerDelta: heroCenter != null && frameCenter != null ? Math.abs(heroCenter - frameCenter) : null,
          identityCenterDelta: ir && fr ? Math.abs((ir.left + ir.width / 2) - (fr.left + fr.width / 2)) : null,
          statsOffScreen: sr ? sr.right > document.documentElement.clientWidth + 1 : null,
          roleSlotWidth: roleSlot?.getBoundingClientRect().width ?? null,
          thirdSlotWidth: thirdSlot?.getBoundingClientRect().width ?? null,
        }
      })

      expect(layout.portraitTop ?? 0).toBeGreaterThanOrEqual(-2)
      expect(layout.portraitBottom ?? 0).toBeLessThanOrEqual(layout.viewportW + 2)
      if (layout.coverBottom != null && layout.portraitVisibleAboveCover != null) {
        expect(layout.portraitVisibleAboveCover).toBe(true)
      }
      if (layout.nameHandleGap != null) expect(layout.nameHandleGap).toBeLessThanOrEqual(4)
      if (layout.nameFs != null) expect(Math.abs(layout.nameFs - MAIN_NAME_PX)).toBeLessThan(1.5)
      if (layout.handleFs != null) expect(Math.abs(layout.handleFs - MAIN_HANDLE_PX)).toBeLessThan(1.5)
      if (layout.centerDelta != null) expect(layout.centerDelta).toBeLessThanOrEqual(4)
      if (layout.identityCenterDelta != null) expect(layout.identityCenterDelta).toBeLessThanOrEqual(8)
      expect(layout.statsOffScreen).not.toBe(true)
      expect(layout.roleSlotWidth ?? 0).toBe(0)
    })
  })
}

test.describe('profile long name @360px', () => {
  test.use({ viewport: { width: 360, height: 844 } })

  test('long display name does not overflow viewport', async ({ page }) => {
    await openProfile(page)
    const name = page.locator('.margo-profile-identity__name').first()
    if ((await name.count()) === 0) test.skip()
    await page.evaluate(() => {
      const el = document.querySelector('.margo-profile-identity__name') as HTMLElement | null
      if (el) el.textContent = 'Very Long Display Name That Should Wrap Or Ellipsize Cleanly'
    })
    const box = await name.boundingBox()
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(-1)
      expect(box.x + box.width).toBeLessThanOrEqual(361)
    }
  })
})
