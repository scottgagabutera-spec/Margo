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

    test('portrait in viewport; identity clears photo; shared time under lyric; mood not off-screen', async ({ page }) => {
      const card = await firstFeedCard(page)
      const portrait = card.locator('[data-testid="feed-portrait-avatar"]').first()
      await expect(portrait).toBeVisible()

      const layout = await card.evaluate((cardEl) => {
        const doc = document.documentElement
        const portraitEl = cardEl.querySelector('[data-testid="feed-portrait-avatar"]') as HTMLElement | null
        const identity = cardEl.querySelector('[data-testid="feed-header-identity"]') as HTMLElement | null
        const lyric = cardEl.querySelector('.margo-post-card__lyric-zone') as HTMLElement | null
        const shared = cardEl.querySelector('.margo-post-card__shared-time') as HTMLElement | null
        const song = cardEl.querySelector('.margo-post-card__song-block') as HTMLElement | null
        const mood = cardEl.querySelector('.margo-post-card__mood') as HTMLElement | null

        const pr = portraitEl?.getBoundingClientRect()
        const ir = identity?.getBoundingClientRect()
        const lr = lyric?.getBoundingClientRect()
        const sr = shared?.getBoundingClientRect()
        const songR = song?.getBoundingClientRect()
        const moodR = mood?.getBoundingClientRect()

        const gapIdentityPhoto =
          pr && ir ? Math.max(0, ir.left - pr.right) : null

        const identityBlock = identity?.querySelector('span[style*="flexDirection"]') as HTMLElement | null
        let nameHandleGap: number | null = null
        if (identityBlock) {
          const kids = identityBlock.children
          if (kids.length >= 2) {
            const a = kids[0].getBoundingClientRect()
            const b = kids[1].getBoundingClientRect()
            nameHandleGap = b.top - a.bottom
          }
        }

        return {
          viewportW: doc.clientWidth,
          portraitTop: pr?.top ?? null,
          portraitBottom: pr?.bottom ?? null,
          portraitLeft: pr?.left ?? null,
          portraitRight: pr?.right ?? null,
          gapIdentityPhoto,
          nameHandleGap,
          sharedBelowLyric: lr && sr ? sr.top >= lr.bottom - 2 : null,
          sharedAboveSong: sr && songR ? sr.bottom <= songR.top + 2 : song ? false : null,
          moodRight: moodR?.right ?? null,
          lyricLeft: lr?.left ?? null,
        }
      })

      expect(layout.portraitLeft).toBeGreaterThanOrEqual(-2)
      expect(layout.portraitRight ?? 0).toBeLessThanOrEqual(layout.viewportW + 2)
      expect(layout.portraitTop ?? 0).toBeGreaterThanOrEqual(-2)
      expect(layout.gapIdentityPhoto ?? 0).toBeGreaterThan(4)
      if (layout.sharedBelowLyric != null) expect(layout.sharedBelowLyric).toBe(true)
      if (layout.sharedAboveSong != null) expect(layout.sharedAboveSong).toBe(true)
      if (layout.moodRight != null) {
        expect(layout.moodRight).toBeLessThanOrEqual(layout.viewportW + 1)
      }
      if (layout.lyricLeft != null && layout.portraitRight != null) {
        expect(layout.lyricLeft).toBeLessThanOrEqual(layout.portraitRight + 4)
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
