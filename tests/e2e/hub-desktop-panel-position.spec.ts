import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

test.describe('hub desktop panel position @1280', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('panel stays in viewport and aligns to nav Hub button', async ({ page }) => {
    await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(600)

    const hubButton = page.locator('.margo-nav-bar button[data-hub-anchor="nav"]')
    await hubButton.click({ timeout: 10000 })

    const panel = page.locator('.margo-hub-panel')
    await expect(panel).toBeVisible({ timeout: 10000 })

    const layout = await page.evaluate(() => {
      const btn = document.querySelector(
        '.margo-nav-bar button[data-hub-anchor="nav"]',
      ) as HTMLElement | null
      const panelEl = document.querySelector('.margo-hub-panel') as HTMLElement | null
      if (!btn || !panelEl) return { ok: false, reason: 'missing elements' }

      const br = btn.getBoundingClientRect()
      const pr = panelEl.getBoundingClientRect()
      const vw = document.documentElement.clientWidth
      const vh = document.documentElement.clientHeight
      const margin = 8

      const inViewport =
        pr.left >= margin - 1
        && pr.top >= margin - 1
        && pr.right <= vw - margin + 1
        && pr.bottom <= vh - margin + 1

      const rightDelta = Math.abs(pr.right - br.right)

      return {
        ok: inViewport && rightDelta <= 16,
        inViewport,
        rightDelta,
        panel: { left: pr.left, top: pr.top, right: pr.right, bottom: pr.bottom },
        button: { right: br.right, bottom: br.bottom },
        vw,
        vh,
      }
    })

    expect(layout.ok, JSON.stringify(layout)).toBe(true)
  })
})
