import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

const GATES = [
  ['/library', 'Save lines and songs'],
  ['/messages', 'Sign in to see your messages'],
  ['/notifications', 'Sign in to see your notifications'],
] as const

test.describe('signed-out gate @390', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  for (const [path, benefit] of GATES) {
    test(`gold CTA on ${path}`, async ({ page }) => {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await expect(page.getByText(benefit, { exact: false })).toBeVisible()
      const btn = page.locator('main').getByRole('link', { name: /^Sign in$/i })
      await expect(btn).toBeVisible()
      const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor)
      expect(bg).not.toBe('rgba(0, 0, 0, 0)')
    })
  }
})
