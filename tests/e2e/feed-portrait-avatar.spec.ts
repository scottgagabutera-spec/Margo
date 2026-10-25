import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

/** Main feed PostCard stacked header (16px root): 0.82rem / 0.7rem */
const MAIN_NAME_PX = 0.82 * 16
const MAIN_HANDLE_PX = 0.7 * 16

async function firstFeedCard(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(1200)
  const card = page.locator('.margo-post-card--portrait-feed').first()
  if ((await card.count()) === 0) {
    const legacy = page.locator('.margo-post-card').first()
    await expect(legacy).toBeVisible({ timeout: 15000 })
    test.skip(true, 'Portrait feed cards not deployed on base URL yet')
  }
  await expect(card).toBeVisible({ timeout: 15000 })
  return card
}

for (const width of [360, 390, 834]) {
  test.describe(`feed portrait header @${width}px`, () => {
    test.use({ viewport: { width, height: 844 } })

    test('position, main font sizes, relative time, third-line fit', async ({ page }) => {
      const card = await firstFeedCard(page)
      await expect(card.locator('[data-testid="feed-portrait-avatar"]').first()).toBeVisible()

      const layout = await card.evaluate((cardEl) => {
        const cardR = cardEl.getBoundingClientRect()
        const frame = cardEl.querySelector('.margo-portrait-avatar__frame') as HTMLElement | null
        const identity = cardEl.querySelector('[data-testid="feed-header-identity"]') as HTMLElement | null
        const nameLine = cardEl.querySelector('[data-testid="feed-header-name-line"]') as HTMLElement | null
        const nameText = nameLine?.querySelector('span[style*="fontWeight: 600"]') as HTMLElement | null
        const handleText = identity?.querySelector('a, span[style*="text-secondary"]') as HTMLElement | null
        const mood = cardEl.querySelector('.margo-post-card__mood') as HTMLElement | null
        const timeLine = cardEl.querySelector('.margo-post-card__shared-time') as HTMLElement | null

        const fr = frame?.getBoundingClientRect()
        const ir = identity?.getBoundingClientRect()
        const nr = nameLine?.getBoundingClientRect()
        const nameFs = nameText ? parseFloat(getComputedStyle(nameText).fontSize) : null
        const handleFs = handleText ? parseFloat(getComputedStyle(handleText).fontSize) : null
        const moodR = mood?.getBoundingClientRect()

        const hGap = fr && ir ? ir.left - fr.right : null
        const topOffset = ir ? ir.top - cardR.top : null
        const moodTopOffset = moodR ? moodR.top - cardR.top : null
        const nameHandleGap =
          nr && handleText ? handleText.getBoundingClientRect().top - nr.bottom : null
        const nameCenter = nr ? (nr.top + nr.bottom) / 2 : null
        const moodCenter = moodR ? (moodR.top + moodR.bottom) / 2 : null

        const third = document.createElement('span')
        third.textContent = 'Artist'
        third.setAttribute('data-testid', 'feed-test-role-line')
        third.style.margin = '0'
        third.style.padding = '0'
        third.style.fontSize = '0.65rem'
        third.style.lineHeight = '1.2'
        third.style.color = 'var(--text-muted)'
        const stack = identity?.querySelector('.margo-feed-header-identity-stack') as HTMLElement | null
        const roleSlot = identity?.querySelector('[data-testid="feed-role-third-slot"]') as HTMLElement | null
        if (stack && roleSlot) {
          stack.insertBefore(third, roleSlot.nextSibling)
        } else if (stack) {
          stack.appendChild(third)
        } else {
          identity?.appendChild(third)
        }

        const ir3 = identity?.getBoundingClientRect()
        const photoBottom = fr?.bottom ?? null
        const blockBottom = ir3?.bottom ?? null

        third.remove()

        const timeText = timeLine?.textContent?.trim() ?? ''
        const roleSlot = cardEl.querySelector('[data-testid="feed-author-role-slot"]') as HTMLElement | null
        const thirdSlot = cardEl.querySelector('[data-testid="feed-role-third-slot"]') as HTMLElement | null

        return {
          hGap,
          topOffset,
          moodTopOffset,
          nameHandleGap,
          nameFs,
          handleFs,
          nameMoodCenterDelta:
            nameCenter != null && moodCenter != null ? Math.abs(nameCenter - moodCenter) : null,
          blockBottom,
          photoBottom,
          thirdLineFits:
            photoBottom != null && blockBottom != null ? blockBottom <= photoBottom + 6 : null,
          timeText,
          roleSlotWidth: roleSlot?.getBoundingClientRect().width ?? null,
          thirdSlotWidth: thirdSlot?.getBoundingClientRect().width ?? null,
        }
      })

      expect(layout.hGap ?? 99).toBeLessThanOrEqual(12)
      expect(layout.topOffset ?? -99).toBeGreaterThanOrEqual(4)
      expect(layout.topOffset ?? 99).toBeLessThanOrEqual(16)
      if (layout.moodTopOffset != null) {
        expect(layout.moodTopOffset).toBeGreaterThanOrEqual(4)
        expect(layout.moodTopOffset).toBeLessThanOrEqual(20)
      }
      if (layout.nameHandleGap != null) expect(layout.nameHandleGap).toBeLessThanOrEqual(4)
      if (layout.nameFs != null) expect(Math.abs(layout.nameFs - MAIN_NAME_PX)).toBeLessThan(1.5)
      if (layout.handleFs != null) expect(Math.abs(layout.handleFs - MAIN_HANDLE_PX)).toBeLessThan(1.5)
      if (layout.nameMoodCenterDelta != null) expect(layout.nameMoodCenterDelta).toBeLessThanOrEqual(6)
      if (layout.thirdLineFits != null) expect(layout.thirdLineFits).toBe(true)
      expect(layout.timeText.toLowerCase()).not.toContain('shared')
      expect(layout.timeText).not.toMatch(/^[A-Z][a-z]{2}\s+\d/)
      expect(layout.roleSlotWidth ?? 0).toBe(0)
      expect(layout.thirdSlotWidth ?? 0).toBe(0)
    })
  })
}
