import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'

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

    test('portrait alignment, time copy, role slot, brand inset', async ({ page }) => {
      const card = await firstFeedCard(page)
      const portrait = card.locator('[data-testid="feed-portrait-avatar"]').first()
      await expect(portrait).toBeVisible()

      const layout = await card.evaluate((cardEl) => {
        const doc = document.documentElement
        const portraitBtn = cardEl.querySelector('[data-testid="feed-portrait-avatar"]') as HTMLElement | null
        const frame = cardEl.querySelector('.margo-portrait-avatar__frame') as HTMLElement | null
        const identity = cardEl.querySelector('[data-testid="feed-header-identity"]') as HTMLElement | null
        const nameEl = identity?.querySelector('span[style*="fontWeight: 600"]') as HTMLElement | null
        const lyric = cardEl.querySelector('.margo-post-card__lyric-zone') as HTMLElement | null
        const timeLine = cardEl.querySelector('.margo-post-card__shared-time') as HTMLElement | null
        const song = cardEl.querySelector('.margo-post-card__song-block') as HTMLElement | null
        const mood = cardEl.querySelector('.margo-post-card__mood') as HTMLElement | null
        const roleSlot = cardEl.querySelector('[data-testid="feed-author-role-slot"]') as HTMLElement | null

        const pr = portraitBtn?.getBoundingClientRect()
        const fr = frame?.getBoundingClientRect()
        const ir = identity?.getBoundingClientRect()
        const nr = nameEl?.getBoundingClientRect()
        const lr = lyric?.getBoundingClientRect()
        const tr = timeLine?.getBoundingClientRect()
        const songR = song?.getBoundingClientRect()
        const moodR = mood?.getBoundingClientRect()

        const photoTop = fr?.top ?? pr?.top ?? null
        const photoBottom = fr?.bottom ?? pr?.bottom ?? null
        const photoCenter = photoTop != null && photoBottom != null ? (photoTop + photoBottom) / 2 : null
        const textCenter = ir ? (ir.top + ir.bottom) / 2 : null
        const moodCenter = moodR ? (moodR.top + moodR.bottom) / 2 : null

        const brandMark = cardEl.querySelector('.margo-portrait-avatar__brand-mark') as SVGSVGElement | null
        let brandInsetRatio: number | null = null
        if (brandMark && fr) {
          const mb = brandMark.getBoundingClientRect()
          const padX = (fr.width - mb.width) / 2
          brandInsetRatio = fr.width > 0 ? padX / fr.width : null
        }

        const timeText = timeLine?.textContent?.trim() ?? ''

        return {
          viewportW: doc.clientWidth,
          photoTop,
          photoBottom,
          nameTop: nr?.top ?? null,
          nameTopMinusPhotoTop: photoTop != null && nr?.top != null ? nr.top - photoTop : null,
          textCenter,
          photoCenter,
          moodTextCenterDelta:
            textCenter != null && moodCenter != null ? Math.abs(moodCenter - textCenter) : null,
          gapIdentityPhoto: pr && ir ? Math.max(0, ir.left - pr.right) : null,
          sharedBelowLyric: lr && tr ? tr.top >= lr.bottom - 2 : null,
          sharedAboveSong: tr && songR ? tr.bottom <= songR.top + 2 : song ? false : null,
          moodRight: moodR?.right ?? null,
          timeText,
          roleSlotWidth: roleSlot?.getBoundingClientRect().width ?? null,
          brandInsetRatio,
        }
      })

      expect(layout.photoTop ?? 0).toBeGreaterThanOrEqual(-4)
      if (layout.photoTop != null && layout.nameTop != null) {
        expect(layout.nameTop).toBeGreaterThanOrEqual(layout.photoTop - 2)
      }
      if (layout.photoBottom != null && layout.nameTop != null) {
        expect(layout.nameTop).toBeLessThanOrEqual(layout.photoBottom)
      }
      if (layout.moodTextCenterDelta != null) {
        expect(layout.moodTextCenterDelta).toBeLessThanOrEqual(6)
      }
      expect(layout.gapIdentityPhoto ?? 0).toBeGreaterThan(4)
      if (layout.sharedBelowLyric != null) expect(layout.sharedBelowLyric).toBe(true)
      if (layout.sharedAboveSong != null) expect(layout.sharedAboveSong).toBe(true)
      if (layout.moodRight != null) {
        expect(layout.moodRight).toBeLessThanOrEqual(layout.viewportW + 1)
      }
      expect(layout.timeText.toLowerCase()).not.toContain('shared')
      expect(layout.roleSlotWidth ?? 0).toBe(0)
      if (layout.brandInsetRatio != null) {
        expect(layout.brandInsetRatio).toBeGreaterThanOrEqual(0.12)
      }
    })
  })
}

test.describe('feed portrait long name @390px', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('mood chip stays on screen when display name is long', async ({ page }) => {
    await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(800)
    const card = page.locator('.margo-post-card--portrait-feed').first()
    if ((await card.count()) === 0) test.skip()

    await page.evaluate(() => {
      const name = document.querySelector(
        '.margo-post-card--portrait-feed [data-testid="feed-header-identity"] span[style*="fontWeight: 600"]',
      ) as HTMLElement | null
      if (name) name.textContent = 'Very Long Display Name That Should Ellipsize'
    })

    const moodRight = await card.locator('.margo-post-card__mood').first().evaluate((el) => {
      return el.getBoundingClientRect().right
    }).catch(() => null)

    if (moodRight != null) {
      const vw = page.viewportSize()?.width ?? 390
      expect(moodRight).toBeLessThanOrEqual(vw + 1)
    }
  })
})
