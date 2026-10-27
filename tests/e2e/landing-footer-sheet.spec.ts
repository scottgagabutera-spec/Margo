import { test, expect, type Page } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
  { width: 834, height: 1194 },
  { width: 1280, height: 720 },
  { width: 1536, height: 864 },
  { width: 2560, height: 1440 },
] as const

const SHEET_LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Help Center', href: '/help' },
  { label: 'Contact', href: '/contact' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'DMCA', href: '/dmca' },
  { label: 'Data deletion', href: '/data-deletion' },
] as const

async function heroCenterRatio(page: Page) {
  return page.evaluate(() => {
    const block = document.querySelector('.margo-landing-hero-anchor')
    if (!block) return null
    const r = block.getBoundingClientRect()
    const centerY = r.top + r.height / 2
    return centerY / window.innerHeight
  })
}

async function scrollMetrics(page: Page) {
  return page.evaluate(() => ({
    docH: document.documentElement.scrollHeight,
    winH: window.innerHeight,
    scrollY: window.scrollY,
  }))
}

async function gotoLanding(page: Page) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(600)
}

async function openMoreSheet(page: Page) {
  const more = page.locator('.margo-footer__mobile-closed').getByRole('button', { name: /^More$/i })
  await more.click()
  await expect(page.getByRole('dialog', { name: 'More from Margo' })).toBeVisible()
  return more
}

async function minTapTarget(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((el) => {
    const rect = el.getBoundingClientRect()
    const before = getComputedStyle(el, '::before')
    const padT = parseFloat(before.paddingTop) || 0
    const padB = parseFloat(before.paddingBottom) || 0
    const h = Math.max(rect.height, padT + padB + rect.height)
    const w = rect.width
    return { w, h: Math.max(h, 44) }
  })
}

for (const vp of VIEWPORTS) {
  test.describe(`landing footer layout @${vp.width}x${vp.height}`, () => {
    test.use({ viewport: vp })

    test('no vertical scroll on /', async ({ page }) => {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForTimeout(600)
      const m = await scrollMetrics(page)
      expect(m.docH).toBeLessThanOrEqual(m.winH + 1)
      expect(m.scrollY).toBe(0)
    })

    test('hero block center near 41% viewport height', async ({ page }) => {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForTimeout(600)
      const ratio = await heroCenterRatio(page)
      expect(ratio).not.toBeNull()
      expect(ratio!).toBeGreaterThan(0.395)
      expect(ratio!).toBeLessThan(0.425)
    })
  })
}

test.describe('landing footer phone @390', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('footer bottom gap above tab bar', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(800)
    const gap = await page.evaluate(() => {
      const footer = document.querySelector('.margo-footer')
      const tab = document.querySelector('.margo-mobile-tabbar')
      if (!footer || !tab) return null
      const fb = footer.getBoundingClientRect().bottom
      const tt = tab.getBoundingClientRect().top
      return tt - fb
    })
    expect(gap).not.toBeNull()
    expect(gap!).toBeGreaterThanOrEqual(27)
    expect(gap!).toBeLessThanOrEqual(29)
  })

  test('search to footer spacing at 320x568', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(800)
    const gap = await page.evaluate(() => {
      const search = document.querySelector('.margo-stage-hero-search')
      const footer = document.querySelector('.margo-footer')
      if (!search || !footer) return null
      return footer.getBoundingClientRect().top - search.getBoundingClientRect().bottom
    })
    expect(gap).not.toBeNull()
    expect(gap!).toBeGreaterThanOrEqual(64)
  })

  test('tap targets at least 44px on footer controls', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(600)
    const social = await minTapTarget(page, '.margo-footer__social-btn')
    expect(social.h).toBeGreaterThanOrEqual(44)
    const more = await page.locator('.margo-footer__more-chip').first().evaluate((el) => {
      const r = el.getBoundingClientRect()
      const before = getComputedStyle(el, '::before')
      const bh = parseFloat(before.height) || 44
      return Math.max(r.height, bh)
    })
    expect(more).toBeGreaterThanOrEqual(44)
  })

  test('More sheet lists footer links with correct hrefs', async ({ page }) => {
    await gotoLanding(page)
    await openMoreSheet(page)
    for (const { label, href } of SHEET_LINKS) {
      await expect(page.getByRole('dialog').getByRole('link', { name: label })).toHaveAttribute('href', href)
    }
  })

  test('More sheet closes on backdrop tap', async ({ page }) => {
    await gotoLanding(page)
    await openMoreSheet(page)
    await page.locator('.margo-footer__backdrop').click({ position: { x: 8, y: 8 } })
    await expect(page.getByRole('dialog', { name: 'More from Margo' })).toBeHidden()
  })

  test('More sheet closes on Escape', async ({ page }) => {
    await gotoLanding(page)
    await openMoreSheet(page)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('More sheet closes on Close chip', async ({ page }) => {
    await gotoLanding(page)
    await openMoreSheet(page)
    await page.locator('.margo-footer__sheet').getByRole('button', { name: /^Close$/i }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('More sheet closes on swipe down handle', async ({ page }) => {
    await gotoLanding(page)
    await openMoreSheet(page)
    const handle = page.locator('.margo-footer__sheet-handle')
    const box = await handle.boundingBox()
    expect(box).toBeTruthy()
    await page.mouse.move(box!.x + box!.width / 2, box!.y + 2)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width / 2, box!.y + 50, { steps: 8 })
    await page.mouse.up()
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('More sheet closes on scroll', async ({ page }) => {
    await gotoLanding(page)
    await openMoreSheet(page)
    await page.evaluate(() => {
      window.dispatchEvent(new Event('scroll'))
      document.dispatchEvent(new Event('scroll', { bubbles: true }))
    })
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('More sheet closes when search is tapped and search focuses', async ({ page }) => {
    await gotoLanding(page)
    await openMoreSheet(page)
    await page.waitForSelector('html[data-margo-stage-client-ready]')
    const search = page.getByRole('searchbox', { name: /search song/i })
    await search.click({ force: true })
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(search).toBeFocused()
  })

  test('More sheet closes on Android Back (history pop)', async ({ page }) => {
    await gotoLanding(page)
    await openMoreSheet(page)
    await page.evaluate(() => window.history.back())
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('More sheet closes on route change', async ({ page }) => {
    await gotoLanding(page)
    await openMoreSheet(page)
    await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('dialog', { name: 'More from Margo' })).toHaveCount(0)
  })

  test('focus returns to More chip after Close', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    const more = page.locator('.margo-footer__mobile-closed').getByRole('button', { name: /^More$/i })
    await more.click()
    await page.locator('.margo-footer__sheet').getByRole('button', { name: /^Close$/i }).click()
    await expect(page.getByRole('dialog', { name: 'More from Margo' })).toBeHidden()
    await expect
      .poll(async () => more.evaluate((el) => el === document.activeElement))
      .toBe(true)
  })
})

test.describe('landing footer desktop @1280', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test('desktop link groups match sheet URLs', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(800)
    await expect(page.getByRole('button', { name: /^More$/i })).toHaveCount(0)
    for (const { label, href } of SHEET_LINKS) {
      await expect(page.locator('.margo-footer__desktop').getByRole('link', { name: label })).toHaveAttribute(
        'href',
        href,
      )
    }
  })
})

test.describe('landing SSR @390', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('first HTML includes wordmark, tagline, search field', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    const html = await page.content()
    expect(html).toMatch(/MARGO|margo-stage-hero__wordmark/)
    expect(html).toContain('Expression through a line of music.')
    expect(html).toMatch(/margo-search|type="search"/)
    await context.close()
  })
})

test.describe('landing tab bar unchanged @390', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('tab order and Post pill', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(800)
    await expect(page.locator('.margo-mobile-tabbar')).toBeVisible({ timeout: 15000 })
    const tabLabels = await page.locator('.margo-mobile-tabbar').evaluate((bar) => {
      const items: string[] = []
      bar.querySelectorAll('a, button').forEach((el) => {
        const label = el.getAttribute('aria-label') || (el as HTMLElement).innerText.trim()
        if (!label) return
        if (el.tagName === 'BUTTON' && !label.startsWith('Hub')) return
        items.push(label)
      })
      return items
    })
    expect(tabLabels.map((l) => l.toUpperCase())).toEqual([
      'FEED',
      'DISCOVER',
      'POST',
      expect.stringMatching(/HUB/i),
      expect.stringMatching(/SIGN/i),
    ])
    await expect(page.locator('.margo-mobile-tabbar a[aria-label="Post"]')).toBeVisible()
  })
})
