import { test, expect } from '@playwright/test'

/**
 * Landing → Compose via Post, then logo home must restore calm landing chrome
 * without compose layout attributes on <html>.
 */
test.describe('landing logo return from compose', () => {
  test('logo clears compose layout and shows landing hero', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.margo-stage-hero__wordmark-wrap', { timeout: 20_000 })

    const search = page.getByPlaceholder(/search/i).first()
    await search.click()
    await search.fill('margo')
    await page.waitForTimeout(800)
    const firstHit = page.locator('[data-margo-search-hit]').first()
    await expect(firstHit).toBeVisible({ timeout: 15_000 })
    await firstHit.click()

    const lineBtn = page.locator('[data-margo-line-pick]').first()
    await expect(lineBtn).toBeVisible({ timeout: 15_000 })
    await lineBtn.click()

    await expect(page.locator('.margo-composer-shell, .margo-moment-studio--calm')).toBeVisible({
      timeout: 15_000,
    })

    await page.getByRole('button', { name: /post this line/i }).click()
    await page.waitForURL(/\/compose/, { timeout: 15_000 })

    await page.getByRole('link', { name: /margo/i }).first().click()
    await page.waitForURL('/', { timeout: 15_000 })

    const html = page.locator('html')
    await expect(html).not.toHaveAttribute('data-margo-compose-search-active', /.*/)
    await expect(html).not.toHaveAttribute('data-margo-compose-shift-animate', /.*/)
    await expect(html).not.toHaveAttribute('data-margo-compose-compact', /.*/)
    await expect(page.locator('.margo-stage-hero__wordmark-wrap')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.margo-compose-search-shift')).toHaveCount(0)
  })
})
