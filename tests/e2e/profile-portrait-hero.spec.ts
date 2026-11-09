import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

const MAIN_NAME_PX = 15
const MAIN_HANDLE_PX = 12

async function openProfile(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  const link = page.locator('a[href^="/profile/"]').first()
  await expect(link).toBeVisible({ timeout: 25000 })
  await link.click()
  await page.waitForURL(/\/profile\//, { timeout: 15000 })
  await expect(page.locator('[data-testid="profile-hero-cluster"]').first()).toBeVisible({ timeout: 20000 })
  await page.waitForTimeout(400)
}

for (const width of [390, 768, 1280]) {
  test.describe(`profile hero cluster @${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('portrait visible, centred identity, tight handle gap', async ({ page }) => {
      await openProfile(page)
      const hero = page.locator('[data-testid="profile-hero-cluster"]').first()
      if ((await hero.count()) === 0) test.skip(true, 'Profile hero cluster not deployed')
      await expect(hero).toBeVisible()

      const layout = await page.evaluate(() => {
        const heroEl = document.querySelector('[data-testid="profile-hero-cluster"]') as HTMLElement | null
        const frame = document.querySelector('[data-testid="profile-portrait-photo"] .margo-portrait-avatar__frame') as HTMLElement | null
        const shell = document.querySelector('.margo-profile-shell') as HTMLElement | null
        const identity = document.querySelector('[data-testid="profile-identity-block"]') as HTMLElement | null
        const name = document.querySelector('.margo-profile-identity__name') as HTMLElement | null
        const handle = document.querySelector('.margo-profile-identity__handle') as HTMLElement | null
        const stats = document.querySelector('.margo-profile-stats') as HTMLElement | null
        const pageEl = document.querySelector('.margo-profile-page') as HTMLElement | null

        const fr = frame?.getBoundingClientRect()
        const ir = identity?.getBoundingClientRect()
        const nr = name?.getBoundingClientRect()
        const hr = handle?.getBoundingClientRect()
        const sr = stats?.getBoundingClientRect()
        const pr = pageEl?.getBoundingClientRect()

        const nameFs = name ? parseFloat(getComputedStyle(name).fontSize) : null
        const handleFs = handle ? parseFloat(getComputedStyle(handle).fontSize) : null
        const nameHandleGap = nr && hr ? hr.top - nr.bottom : null

        const roleSlot = document.querySelector('[data-testid="profile-author-role-slot"]') as HTMLElement | null
        const thirdSlot = document.querySelector('[data-testid="profile-role-third-slot"]') as HTMLElement | null

        const portraitTop = fr?.top ?? null

        const heroCenter = heroEl ? heroEl.getBoundingClientRect().left + heroEl.getBoundingClientRect().width / 2 : null
        const frameCenter = fr ? fr.left + fr.width / 2 : null

        const navH = parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--margo-header-h') ||
            getComputedStyle(document.documentElement).getPropertyValue('--nav-height') ||
            '72',
        )

        return {
          viewportW: document.documentElement.clientWidth,
          hasShell: !!shell,
          portraitTop,
          portraitBottom: fr?.bottom,
          pageTop: pr?.top ?? null,
          navH,
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

      expect(layout.hasShell).toBe(true)
      expect(layout.portraitTop ?? 0).toBeGreaterThanOrEqual(-2)
      expect(layout.portraitBottom ?? 0).toBeLessThanOrEqual(layout.viewportW + 2)
      if (layout.nameHandleGap != null) expect(layout.nameHandleGap).toBeLessThanOrEqual(4)
      if (layout.nameFs != null) expect(Math.abs(layout.nameFs - MAIN_NAME_PX)).toBeLessThan(1.5)
      if (layout.handleFs != null) expect(Math.abs(layout.handleFs - MAIN_HANDLE_PX)).toBeLessThan(1.5)
      if (layout.centerDelta != null) expect(layout.centerDelta).toBeLessThanOrEqual(4)
      if (layout.identityCenterDelta != null) expect(layout.identityCenterDelta).toBeLessThanOrEqual(8)
      expect(layout.statsOffScreen).not.toBe(true)
      expect(layout.roleSlotWidth ?? 0).toBe(0)
      if (width >= 768 && layout.pageTop != null) {
        expect(layout.pageTop).toBeGreaterThanOrEqual(layout.navH + 40)
      }
    })
  })
}

test.describe('profile long name @390px', () => {
  test.use({ viewport: { width: 390, height: 844 } })

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
      expect(box.x + box.width).toBeLessThanOrEqual(391)
    }
  })
})
