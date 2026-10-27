import { test, expect, type Page } from '@playwright/test'

async function gotoLanding(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
}

async function mockGenius(page: Page) {
  await page.route('**/api/genius?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: [
          { id: 'g1', song: 'Alpha Song', artist: 'Artist A', artwork: '', source: 'genius' },
          { id: 'g2', song: 'Beta Song', artist: 'Artist B', artwork: '', source: 'genius' },
          { id: 'g3', song: 'Gamma Song', artist: 'Artist C', artwork: '', source: 'genius' },
        ],
      }),
    })
  })
}

function rowFullyVisible(
  rowTop: number,
  rowBottom: number,
  visibleTop: number,
  visibleBottom: number,
): boolean {
  return rowTop >= visibleTop - 1 && rowBottom <= visibleBottom + 1
}

async function assertLandingSearchKeyboardLayout(
  page: Page,
  width: number,
  fullHeight: number,
  shrunkHeight: number,
) {
  await page.setViewportSize({ width, height: fullHeight })
  await mockGenius(page)
  await gotoLanding(page)
  await page.waitForSelector('html[data-margo-stage-client-ready]')

  const search = page.getByRole('searchbox', { name: /search song/i })
  await search.focus()
  await search.fill('ab')
  const geniusResponse = page.waitForResponse((r) => r.url().includes('/api/genius') && r.status() === 200)
  await geniusResponse
  await expect(page.getByRole('listbox', { name: 'Song search results' })).toBeVisible({ timeout: 15000 })

  await page.setViewportSize({ width, height: shrunkHeight })
  await page.waitForTimeout(280)

  const metrics = await page.evaluate(() => {
    const vv = window.visualViewport
    const visibleTop = vv?.offsetTop ?? 0
    const visibleBottom = visibleTop + (vv?.height ?? window.innerHeight)
    const shell = document.querySelector('.margo-landing-page-shell')
    const shellH = shell?.getBoundingClientRect().height ?? window.innerHeight
    const block = document.querySelector('.margo-landing-hero-anchor')
    const blockCenter = block
      ? block.getBoundingClientRect().top + block.getBoundingClientRect().height / 2
      : 0
    const searchEl = document.querySelector(
      '.margo-stage-hero:not(.margo-stage-hero--ssr) .margo-search-wrap--standard',
    )
    const searchTop = searchEl?.getBoundingClientRect().top ?? 0
    const goalTop = visibleTop + Math.max(16, (vv?.height ?? window.innerHeight) * 0.12)
    const rows = Array.from(document.querySelectorAll('.compose-search-row--stage')).slice(0, 3)
    const rowRects = rows.map((r) => {
      const rect = r.getBoundingClientRect()
      return { top: rect.top, bottom: rect.bottom }
    })
    const list = document.querySelector('[role="listbox"][aria-label="Song search results"]')
    const listStyle = list ? getComputedStyle(list) : null
    const docScroll = document.documentElement.scrollHeight > window.innerHeight + 2
    return {
      visibleTop,
      visibleBottom,
      searchTop,
      goalTop,
      rowRects,
      listOverflowY: listStyle?.overflowY ?? '',
      shellH,
      blockCenter,
      docScroll,
      active: document.documentElement.hasAttribute('data-margo-landing-search-active'),
    }
  })

  expect(metrics.active).toBe(true)
  expect(Math.abs(metrics.searchTop - metrics.goalTop)).toBeLessThanOrEqual(8)
  expect(metrics.rowRects.length).toBeGreaterThanOrEqual(2)
  expect(rowFullyVisible(metrics.rowRects[0].top, metrics.rowRects[0].bottom, metrics.visibleTop, metrics.visibleBottom)).toBe(true)
  expect(rowFullyVisible(metrics.rowRects[1].top, metrics.rowRects[1].bottom, metrics.visibleTop, metrics.visibleBottom)).toBe(true)
  if (metrics.rowRects[2]) {
    const r3 = metrics.rowRects[2]
    const thirdPeeks =
      (r3.top < metrics.visibleBottom && r3.bottom > metrics.visibleBottom)
      || (r3.top >= metrics.visibleTop && r3.bottom <= metrics.visibleBottom + 1)
    expect(thirdPeeks).toBe(true)
  }
  expect(metrics.listOverflowY).toBe('auto')
  expect(metrics.docScroll).toBe(false)

  await search.fill('')
  const dismiss = page.getByRole('button', { name: 'Dismiss search' })
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click()
  }
  await search.blur()
  await page.waitForFunction(
    () => !document.documentElement.hasAttribute('data-margo-landing-search-active'),
    undefined,
    { timeout: 5000 },
  )
  await page.setViewportSize({ width, height: fullHeight })
  await page.waitForTimeout(320)

  const idle = await page.evaluate(() => {
    const shell = document.querySelector('.margo-landing-page-shell')
    const shellH = shell?.getBoundingClientRect().height ?? window.innerHeight
    const block = document.querySelector('.margo-landing-hero-anchor')
    const blockCenter = block
      ? block.getBoundingClientRect().top + block.getBoundingClientRect().height / 2
      : 0
    return {
      shellH,
      blockCenter,
      active: document.documentElement.hasAttribute('data-margo-landing-search-active'),
    }
  })
  expect(idle.active).toBe(false)
  const targetCenter = idle.shellH * 0.41
  expect(Math.abs(idle.blockCenter - targetCenter)).toBeLessThanOrEqual(idle.shellH * 0.015)
}

const cases = [
  { width: 360, full: 640, shrunk: 360 },
  { width: 390, full: 844, shrunk: 470 },
  { width: 412, full: 915, shrunk: 500 },
] as const

for (const c of cases) {
  test.describe(`landing search keyboard @${c.width}`, () => {
    test(`${c.width}x${c.full} → ${c.width}x${c.shrunk}`, async ({ page }) => {
      await assertLandingSearchKeyboardLayout(page, c.width, c.full, c.shrunk)
    })
  })
}
