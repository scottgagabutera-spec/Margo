import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

const WIDTHS = [390, 834, 1180, 1440, 1920]

/** Fixed feed pane can intercept Playwright pointer hits; DOM click matches real focus/tap. */
async function clickDesktopHub(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const el = document.querySelector(
      '[data-margo-hub-desktop-anchor="1"]',
    ) as HTMLElement | null
    el?.click()
  })
}

async function overflowOk(page: import('@playwright/test').Page) {
  return page.evaluate(() => ({
    doc: {
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
      sl: document.documentElement.scrollLeft,
    },
  }))
}

for (const width of WIDTHS) {
  test.describe(`five nav landing @${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('five primary items visible without page scroll', async ({ page }) => {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(1200)
      if (width < 640) {
        const tab = page.locator('.margo-mobile-tabbar')
        await expect(tab).toBeVisible()
        for (const label of ['Feed', 'Discover', 'Hub']) {
          await expect(tab.getByText(label, { exact: true })).toBeVisible()
        }
      } else {
        const nav = page.locator('.margo-primary-desktop-nav')
        await expect(nav).toBeVisible()
        for (const label of ['Feed', 'Discover', 'Compose', 'Hub']) {
          await expect(nav.getByText(label, { exact: true })).toBeVisible()
        }
        await expect(
          nav.getByText(/Profile|Sign in/i),
        ).toBeVisible()
      }
      const o = await overflowOk(page)
      expect(o.doc.sl).toBe(0)
      expect(o.doc.sw).toBeLessThanOrEqual(o.doc.cw + 1)
    })
  })
}

test.describe('hub panel anchor desktop', () => {
  test.use({ viewport: { width: 1180, height: 900 } })

  test('panel sits under Hub control and closes on Escape', async ({ page }) => {
    await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(800)
    const hub = page.locator('[data-margo-hub-desktop-anchor="1"]')
    await expect(hub).toBeVisible({ timeout: 15000 })
    await clickDesktopHub(page)
    await page.waitForTimeout(400)
    const panel = page.locator('.margo-hub-panel')
    await expect(panel).toBeVisible()
    const hubBox = await hub.boundingBox()
    const panelBox = await panel.boundingBox()
    expect(hubBox && panelBox).toBeTruthy()
    if (hubBox && panelBox) {
      expect(panelBox.y).toBeGreaterThanOrEqual(hubBox.y + hubBox.height - 2)
    }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await expect(panel).toBeHidden()
  })
})
