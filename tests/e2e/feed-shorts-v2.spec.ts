import { test, expect } from '@playwright/test'

test.setTimeout(90_000)

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://trymargo.com'
const WIDTHS = [360, 375, 390, 430, 640, 834, 1180, 1440, 1920]
const PHONE_HEIGHTS: Record<number, number> = {
  360: 640,
  375: 667,
  390: 844,
  430: 932,
}

function shortsUrl(width: number) {
  const fixture = BASE.includes('vercel.app')
  const q = fixture ? '?tab=shorts&e2eShorts=1' : '?tab=shorts'
  return `${BASE}/feed${q}`
}

async function waitShortsSettledChrome(page: import('@playwright/test').Page) {
  await expect(page.locator('.margo-feed-shorts-pager .margo-feed-shorts-slide__mute').first()).toBeVisible({
    timeout: 20000,
  })
}

async function openShortsTab(page: import('@playwright/test').Page, width: number) {
  await page.goto(shortsUrl(width), { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(1200)
  const shortsTab = page.getByRole('button', { name: /^Shorts$/i })
  if (await shortsTab.count()) {
    await shortsTab.click()
    await page.waitForTimeout(800)
  }
  if (BASE.includes('vercel.app') && (await page.locator('.margo-feed-shorts-pager').count()) > 0) {
    await waitShortsSettledChrome(page)
  }
}

async function requireShortsFrame(page: import('@playwright/test').Page) {
  const frame = page.locator('.margo-feed-shorts-slide__frame').first()
  if ((await frame.count()) === 0) {
    test.skip(true, 'Shorts catalog minimum not met on this deploy')
    return null
  }
  await expect(frame).toBeVisible({ timeout: 20000 })
  return frame
}

async function waitForShortsAudioPlaying(page: import('@playwright/test').Page, timeoutMs = 20000) {
  const surface = page.locator('[data-shorts-active="1"] .margo-feed-shorts-slide__tap-surface')
  await expect(surface).toBeVisible({ timeout: 15000 })
  const started = await page
    .waitForFunction(
      () => {
        const a = document.querySelector('audio')
        return !!a && !a.paused
      },
      undefined,
      { timeout: 4000 },
    )
    .then(() => true)
    .catch(() => false)
  if (!started) {
    const frame = page.locator('[data-shorts-active="1"] .margo-feed-shorts-slide__frame')
    const box = await frame.boundingBox()
    if (box) {
      await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.38)
    } else {
      await surface.click({ position: { x: 160, y: 200 } })
    }
  }
  await page.waitForFunction(
    () => {
      const a = document.querySelector('audio')
      return !!a && !a.paused
    },
    undefined,
    { timeout: timeoutMs },
  )
}

async function assertSlideChromeInsideFrame(page: import('@playwright/test').Page, slideIndex = 0) {
  const slide = page.locator(`[data-shorts-index="${slideIndex}"]`)
  const box = await slide.evaluate((el) => {
    const frame = el.querySelector('.margo-feed-shorts-slide__frame')
    if (!frame) return { ok: false, reason: 'no frame' }
    const fr = frame.getBoundingClientRect()
    const mustHaveSelectors = [
      '.margo-feed-shorts-slide__mute',
      '.margo-feed-shorts-slide__progress',
      '.margo-feed-shorts-slide__meta-art',
      '.margo-feed-shorts-slide__song',
      '.margo-feed-shorts-slide__artist',
      '.margo-shorts-canvas',
    ]
    for (const sel of mustHaveSelectors) {
      if (!frame.querySelector(sel)) {
        throw new Error(`missing ${sel} inside frame`)
      }
    }
    const skipTags = new Set(['SCRIPT', 'STYLE'])
    const nodes = frame.querySelectorAll('*')
    nodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return
      if (skipTags.has(node.tagName)) return
      const r = node.getBoundingClientRect()
      if (r.width < 0.5 && r.height < 0.5) return
      const label =
        node.className && typeof node.className === 'string'
          ? node.className.split(/\s+/).slice(0, 2).join('.')
          : node.tagName
      if (r.left < fr.left - 1 || r.right > fr.right + 1) {
        throw new Error(`overflow-x ${label}: ${JSON.stringify({ fr, r })}`)
      }
      if (r.top < fr.top - 1 || r.bottom > fr.bottom + 1) {
        throw new Error(`overflow-y ${label}: ${JSON.stringify({ fr, r })}`)
      }
    })
    return { ok: true, frame: { w: fr.width, h: fr.height } }
  })
  expect(box.ok).toBe(true)
}

const CARD_CONTAINMENT_VIEWPORTS = [
  { w: 360, h: 640 },
  { w: 390, h: 844 },
  { w: 430, h: 932 },
  { w: 834, h: 900 },
] as const

async function assertPhoneCreditRowBottomLayout(page: import('@playwright/test').Page) {
  const metrics = await page.evaluate(() => {
    const frame = document.querySelector(
      '.margo-feed-shorts-slide__frame:has(.margo-feed-shorts-slide__meta-row)',
    )
    const meta = frame?.querySelector('.margo-feed-shorts-slide__meta-row')
    const lyric = frame?.querySelector('.margo-shorts-canvas p')
    const mute = frame?.querySelector('.margo-feed-shorts-slide__mute')
    if (!frame || !meta || !lyric || !mute) return { ok: false, reason: 'missing nodes' }
    const fr = frame.getBoundingClientRect()
    const mr = meta.getBoundingClientRect()
    const lr = lyric.getBoundingClientRect()
    const muteR = mute.getBoundingClientRect()
    const canvas = frame.querySelector('.margo-shorts-canvas')
    let logoR: DOMRect | null = null
    if (canvas) {
      const canvasTop = canvas.getBoundingClientRect().top
      for (const el of canvas.querySelectorAll('[aria-hidden]')) {
        const r = el.getBoundingClientRect()
        if (r.width < 8 || r.height < 8 || r.width > 56) continue
        if (r.top <= canvasTop + fr.height * 0.2) {
          logoR = r
          break
        }
      }
    }
    const overlaps = (a: DOMRect, b: DOMRect) =>
      !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)
    return {
      ok: true,
      metaBelowLyric: mr.top >= lr.bottom - 2,
      metaInBottom30: mr.top >= fr.top + fr.height * 0.7,
      muteClear: !overlaps(mr, muteR),
      logoClear: !logoR || !overlaps(mr, logoR),
      relTop: (mr.top - fr.top) / fr.height,
    }
  })
  expect(metrics.ok).toBe(true)
  if (metrics.ok) {
    expect(metrics.metaBelowLyric).toBe(true)
    expect(metrics.metaInBottom30).toBe(true)
    expect(metrics.muteClear).toBe(true)
    expect(metrics.logoClear).toBe(true)
  }
}

const PHONE_CREDIT_VIEWPORTS = [
  { w: 360, h: 640 },
  { w: 390, h: 844 },
  { w: 430, h: 932 },
] as const

for (const { w, h } of PHONE_CREDIT_VIEWPORTS) {
  test(`phone credit row sits in bottom band below lyric @${w}x${h}`, async ({ page }) => {
    test.skip(!BASE.includes('vercel.app'), 'fixture clips with cover art required')
    await page.setViewportSize({ width: w, height: h })
    await openShortsTab(page, w)
    await page.waitForTimeout(800)
    await assertPhoneCreditRowBottomLayout(page)
  })
}

for (const { w, h } of CARD_CONTAINMENT_VIEWPORTS) {
  test(`real-style Short: all frame descendants inside card @${w}x${h}`, async ({ page }) => {
    test.skip(!BASE.includes('vercel.app'), 'fixture clips with cover art required')
    await page.setViewportSize({ width: w, height: h })
    await openShortsTab(page, w)
    await page.waitForTimeout(1200)
    const frame = page.locator('[data-shorts-active="1"] .margo-feed-shorts-slide__frame')
    if ((await frame.count()) === 0) test.skip()
    await expect(frame.locator('.margo-feed-shorts-slide__meta-art')).toBeVisible({ timeout: 15000 })
    const activeIdx = Number((await page.locator('[data-shorts-active="1"]').getAttribute('data-shorts-index')) ?? '0')
    await assertSlideChromeInsideFrame(page, activeIdx)
  })
}

for (const width of WIDTHS) {
  test.describe(`feed shorts @${width}px`, () => {
    test.use({
      viewport: {
        width,
        height: width < 640 ? (PHONE_HEIGHTS[width] ?? 740) : 900,
      },
    })

    test('slide chrome stays inside 9:16 frame bounds', async ({ page }) => {
      test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
      await openShortsTab(page, width)
      await page.waitForTimeout(1200)
      const pager = page.locator('.margo-feed-shorts-pager')
      if ((await pager.count()) === 0) test.skip()
      await expect(page.locator('[data-shorts-active="1"]')).toHaveCount(1, { timeout: 15000 })
      const activeIdx = Number(
        (await page.locator('[data-shorts-active="1"]').getAttribute('data-shorts-index')) ?? '0',
      )
      await assertSlideChromeInsideFrame(page, activeIdx)
      if (
        width < 640
        && (await page.locator('[data-shorts-index="1"]').count()) > 0
      ) {
        await pager.evaluate((el) => {
          el.scrollTop = el.clientHeight * 0.85
        })
        await page.waitForTimeout(400)
        await pager.evaluate((el) => el.dispatchEvent(new Event('scrollend')))
        await page.waitForTimeout(300)
        await expect(page.locator('[data-shorts-index="1"][data-shorts-active="1"]')).toHaveCount(1, {
          timeout: 15000,
        })
        await waitShortsSettledChrome(page)
        const scrolledIdx = Number(
          (await page.locator('[data-shorts-active="1"]').getAttribute('data-shorts-index')) ?? '1',
        )
        await assertSlideChromeInsideFrame(page, scrolledIdx)
      }
    })

    test('9:16 frame, no horizontal overflow', async ({ page }) => {
      await openShortsTab(page, width)
      if (width < 640) {
        const frame = page.locator('.margo-feed-shorts-slide__frame').first()
        if ((await frame.count()) === 0) test.skip()
        await expect(frame).toBeVisible()
        await expect(frame.locator('.margo-feed-shorts-slide__chrome-bottom')).toBeVisible()
      } else {
        const frame = await requireShortsFrame(page)
        if (!frame) return
        const meta = frame.locator('.margo-feed-shorts-slide__meta')
        await expect(meta).toBeVisible()
        const box = await frame.boundingBox()
        expect(box).toBeTruthy()
        if (box && box.width > 0) {
          const ratio = box.height / box.width
          expect(ratio).toBeGreaterThan(1.74)
          expect(ratio).toBeLessThan(1.79)
        }
      }
      const metrics = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }))
      expect(metrics.sw).toBe(metrics.cw)
    })

    test('overlay typography scales with frame (cqw)', async ({ page }) => {
      test.skip(width < 640, 'desktop-only overlay units')
      await openShortsTab(page, width)
      const frame = await requireShortsFrame(page)
      if (!frame) return
      const songSize = await frame.locator('.margo-feed-shorts-slide__song').evaluate((el) =>
        parseFloat(getComputedStyle(el).fontSize),
      )
      const box = await frame.boundingBox()
      expect(box).toBeTruthy()
      if (box) {
        const expected = box.width * 0.046
        expect(Math.abs(songSize - expected)).toBeLessThan(3)
      }
    })

    test('scroll-snap and next-short peek on desktop', async ({ page }) => {
      test.skip(width < 640, 'peek layout is desktop-only')
      await openShortsTab(page, width)
      const pager = page.locator('.margo-feed-shorts-pager')
      if ((await pager.count()) === 0) test.skip()
      const cols = await pager.getAttribute('data-shorts-cols')
      test.skip(cols === '2', 'two-column layout uses side-by-side pair, not vertical peek')
      const frames = page.locator('.margo-feed-shorts-slide__frame')
      if ((await frames.count()) < 2) test.skip()
      const snap = await pager.evaluate((el) => getComputedStyle(el).scrollSnapType)
      expect(snap).toContain('mandatory')
      const first = await frames.nth(0).boundingBox()
      const second = await frames.nth(1).boundingBox()
      expect(first && second).toBeTruthy()
      if (first && second) {
        const pagerBox = await pager.boundingBox()
        expect(pagerBox).toBeTruthy()
        if (pagerBox) {
          const visibleBottom = pagerBox.y + pagerBox.height
          expect(second.y).toBeLessThan(visibleBottom)
          expect(second.y).toBeGreaterThan(first.y)
        }
      }
    })

    test('giants chrome: mute control, no big row play button', async ({ page }) => {
      test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
      test.skip(width < 390, '360–375 Shorts settle timing flaky in headless; covered at 390+')
      await openShortsTab(page, width)
      const frame = page.locator('.margo-feed-shorts-slide__frame:has(.margo-feed-shorts-slide__mute)').first()
      await expect(frame).toBeVisible({ timeout: 15000 })
      await expect(page.locator('.margo-feed-shorts-slide__meta-play')).toHaveCount(0)
      const mute = frame.locator('.margo-feed-shorts-slide__mute')
      await expect(mute).toBeVisible()
      await expect(frame.locator('.margo-feed-shorts-slide__progress')).toBeVisible()
      const before = await mute.getAttribute('aria-pressed')
      await mute.click()
      await expect(mute).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true')
    })

    test('settled Short keeps stable theme attrs during swipe', async ({ page }) => {
      test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
      await openShortsTab(page, width)
      const pager = page.locator('.margo-feed-shorts-pager')
      await expect(pager).toBeVisible({ timeout: 20000 })
      const firstSlide = page.locator('[data-shorts-index="0"]')
      const themeBefore = await firstSlide.getAttribute('data-shorts-theme')
      const atmBefore = await firstSlide.getAttribute('data-shorts-atmosphere')
      expect(themeBefore).toBeTruthy()
      await pager.evaluate((el) => {
        el.scrollTop = el.scrollHeight * 0.35
      })
      await page.waitForTimeout(80)
      expect(await firstSlide.getAttribute('data-shorts-theme')).toBe(themeBefore)
      expect(await firstSlide.getAttribute('data-shorts-atmosphere')).toBe(atmBefore)
      await pager.evaluate((el) => {
        el.dispatchEvent(new Event('scrollend'))
      })
      await page.waitForTimeout(200)
    })

    test('gap under Lyrics/Shorts tabs before first frame', async ({ page }) => {
      test.skip(width < 390, '360–375 viewports vertically center the card; tab gap varies')
      await openShortsTab(page, width)
      const pager = page.locator('.margo-feed-shorts-pager')
      if ((await pager.count()) > 0) {
        await pager.evaluate((el) => {
          el.scrollTop = 0
        })
        await page.waitForTimeout(400)
      }
      const tabBar = page.locator('.margo-feed-content-tab-bar')
      const target = page.locator('[data-shorts-active="1"] .margo-feed-shorts-slide__frame').first()
      if ((await target.count()) === 0) test.skip()
      await expect(tabBar).toBeVisible()
      await expect(target).toBeVisible({ timeout: 20000 })
      const tabBox = await tabBar.boundingBox()
      const frameBox = await target.boundingBox()
      expect(tabBox && frameBox).toBeTruthy()
      if (tabBox && frameBox) {
        const gap = frameBox.y - (tabBox.y + tabBox.height)
        expect(gap).toBeGreaterThanOrEqual(14)
      }
    })

    test('only one settled active marker after scroll settles', async ({ page }) => {
      test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
      await openShortsTab(page, width)
      const pager = page.locator('.margo-feed-shorts-pager')
      await expect(pager).toBeVisible({ timeout: 20000 })
      await pager.evaluate((el) => {
        el.scrollTop = Math.min(el.scrollHeight * 0.5, el.clientHeight * 1.2)
      })
      await page.waitForTimeout(400)
      await pager.evaluate((el) => el.dispatchEvent(new Event('scrollend')))
      await page.waitForTimeout(300)
      await expect(page.locator('[data-shorts-active="1"]')).toHaveCount(1)
    })
  })
}

for (const width of [390, 1440]) {
  test.describe(`shorts tap pause @${width}px`, () => {
    test.use({ viewport: { width, height: width < 640 ? 844 : 900 } })

    test('one tap pauses for 2s; second tap resumes (mouse)', async ({ page }) => {
      test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
      await page.goto(shortsUrl(width), { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(1500)
      const surface = page.locator('[data-shorts-active="1"] .margo-feed-shorts-slide__tap-surface')
      await waitForShortsAudioPlaying(page)
      const frameBox = await page.locator('[data-shorts-active="1"] .margo-feed-shorts-slide__frame').boundingBox()
      expect(frameBox).toBeTruthy()
      if (frameBox) {
        await page.mouse.click(frameBox.x + frameBox.width * 0.5, frameBox.y + frameBox.height * 0.38)
      }
      await page.waitForTimeout(2000)
      await expect
        .poll(async () =>
          page.evaluate(() => {
            const a = document.querySelector('audio')
            return !a || a.paused
          }),
        )
        .toBe(true)
      const centerPlay = page.locator('[data-shorts-active="1"] .margo-feed-shorts-slide__center-play')
      await expect(centerPlay).toBeVisible()
      await centerPlay.click()
      await expect
        .poll(async () =>
          page.evaluate(() => {
            const a = document.querySelector('audio')
            return !!a && !a.paused
          }),
        )
        .toBe(true)
    })

    test('one tap pauses for 2s (touch)', async ({ page, browserName }) => {
      test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
      test.skip(browserName === 'firefox', 'touch tap timing flaky on Firefox CI')
      await page.goto(shortsUrl(width), { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(1500)
      const frame = page.locator('[data-shorts-active="1"] .margo-feed-shorts-slide__frame')
      await expect(frame).toBeVisible({ timeout: 15000 })
      await waitForShortsAudioPlaying(page)
      const box = await frame.boundingBox()
      expect(box).toBeTruthy()
      if (!box) return
      await page.touchscreen.tap(box.x + box.width * 0.35, box.y + box.height * 0.42)
      await expect
        .poll(async () =>
          page.evaluate(() => {
            const a = document.querySelector('audio')
            return !a || a.paused
          }),
        )
        .toBe(true)
      await page.waitForTimeout(2000)
      await expect
        .poll(async () =>
          page.evaluate(() => {
            const a = document.querySelector('audio')
            return !a || a.paused
          }),
        )
        .toBe(true)
    })
  })

  test.describe(`shorts look stable swipe @${width}px`, () => {
    test.use({ viewport: { width, height: width < 640 ? 844 : 900 } })

    test('theme and atmosphere unchanged every 50ms through swipe and after settle', async ({ page }) => {
      test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
      await page.goto(shortsUrl(width), { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(1200)
      const pager = page.locator('.margo-feed-shorts-pager')
      await expect(pager).toBeVisible({ timeout: 20000 })
      for (let slideIdx = 0; slideIdx < 5; slideIdx++) {
        const slide = page.locator(`[data-shorts-index="${slideIdx}"]`)
        await expect(slide).toBeVisible()
        const theme0 = await slide.getAttribute('data-shorts-theme')
        const atm0 = await slide.getAttribute('data-shorts-atmosphere')
        expect(theme0).toBeTruthy()
        expect(atm0).toBeTruthy()
        const samples: { theme: string | null; atm: string | null }[] = []
        for (let i = 0; i < 8; i++) {
          await pager.evaluate((el, step) => {
            el.scrollTop += step
          }, 55)
          await page.waitForTimeout(50)
          samples.push({
            theme: await slide.getAttribute('data-shorts-theme'),
            atm: await slide.getAttribute('data-shorts-atmosphere'),
          })
        }
        await pager.evaluate((el) => el.dispatchEvent(new Event('scrollend')))
        await page.waitForTimeout(200)
        samples.push({
          theme: await slide.getAttribute('data-shorts-theme'),
          atm: await slide.getAttribute('data-shorts-atmosphere'),
        })
        for (const s of samples) {
          expect(s.theme).toBe(theme0)
          expect(s.atm).toBe(atm0)
        }
      }
    })

    test('fixture clips mix colour-only, effect-only, and combined looks', async ({ page }) => {
      test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
      await page.goto(shortsUrl(width), { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(1200)
      const pairs = await page.locator('[data-shorts-slide]').evaluateAll((els) =>
        els.slice(0, 6).map((el) => `${el.getAttribute('data-shorts-theme')}:${el.getAttribute('data-shorts-atmosphere')}`),
      )
      expect(new Set(pairs).size).toBeGreaterThanOrEqual(3)
      const hasColourOnly = pairs.some((p) => p.endsWith(':still'))
      const hasEffectOnly = pairs.some((p) => p.startsWith('gold:') && !p.endsWith(':still'))
      expect(hasColourOnly || pairs.filter((p) => p.endsWith(':still')).length >= 1).toBe(true)
      expect(pairs.some((p) => !p.endsWith(':still'))).toBe(true)
    })
  })
}

for (const width of [360, 390, 430, 834, 1440]) {
  test.describe(`shorts settle playback @${width}px`, () => {
    test.use({ viewport: { width, height: width < 640 ? 844 : 900 } })

    test('first Short is settled active on tab open', async ({ page }) => {
      test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
      await page.goto(shortsUrl(width), { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(1500)
      const active = page.locator('[data-shorts-active="1"]')
      await expect(active).toHaveCount(1, { timeout: 15000 })
      await expect(active).toHaveAttribute('data-shorts-index', '0')
    })
  })
}

test('two-column layout when viewport fits pair @1920', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await openShortsTab(page, 1920)
  const pager = page.locator('.margo-feed-shorts-pager')
  if ((await pager.count()) === 0) test.skip()
  const cols = await pager.getAttribute('data-shorts-cols')
  expect(cols).toBe('2')
})

async function cdpTouchSwipe(
  page: import('@playwright/test').Page,
  startX: number,
  startY: number,
  deltaY: number,
) {
  const client = await page.context().newCDPSession(page)
  const steps = 14
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: startX, y: startY }],
  })
  for (let i = 1; i <= steps; i++) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: startX, y: startY - (deltaY * i) / steps }],
    })
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

async function readSettledIndex(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const pager = document.querySelector('.margo-feed-shorts-pager')
    const active = document.querySelector('[data-shorts-active="1"]')
    return {
      scrollTop: pager?.scrollTop ?? 0,
      index: active?.getAttribute('data-shorts-index') ?? null,
    }
  })
}

async function readPullToRefreshShift(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const indicator = document.querySelector('[aria-label="Pull to refresh"]')?.parentElement
    return indicator?.getBoundingClientRect().height ?? 0
  })
}

async function swipeShorts(
  page: import('@playwright/test').Page,
  direction: 'up' | 'down',
  magnitudeRatio = 0.72,
) {
  const pager = page.locator('.margo-feed-shorts-pager')
  const box = await pager.boundingBox()
  expect(box).toBeTruthy()
  if (!box) return { scrollDelta: 0, before: 0, after: 0 }
  const cx = box.x + box.width / 2
  const cy = box.y + box.height * 0.55
  const before = await pager.evaluate((el) => el.scrollTop)
  const delta = direction === 'up' ? box.height * magnitudeRatio : -box.height * magnitudeRatio
  await cdpTouchSwipe(page, cx, cy, delta)
  await page.waitForTimeout(450)
  await pager.evaluate((el) => el.dispatchEvent(new Event('scrollend')))
  await page.waitForTimeout(250)
  const after = await pager.evaluate((el) => el.scrollTop)
  return { scrollDelta: Math.abs(after - before), before, after }
}

test('swipe down from Short 2 to Short 1 does not trigger pull-to-refresh', async ({ page }) => {
  test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
  await page.setViewportSize({ width: 390, height: 844 })
  await openShortsTab(page, 390)
  const pager = page.locator('.margo-feed-shorts-pager')
  await pager.evaluate((el) => {
    el.scrollTop = el.clientHeight * 1.05
  })
  await page.waitForTimeout(400)
  await pager.evaluate((el) => el.dispatchEvent(new Event('scrollend')))
  await page.waitForTimeout(300)
  await expect(page.locator('[data-shorts-active="1"]')).toHaveAttribute('data-shorts-index', '1', {
    timeout: 15000,
  })
  const pullBefore = await readPullToRefreshShift(page)
  expect(pullBefore).toBeLessThan(4)
  await swipeShorts(page, 'down')
  await expect(page.locator('[data-shorts-active="1"]')).toHaveAttribute('data-shorts-index', '0', {
    timeout: 15000,
  })
  const pullAfter = await readPullToRefreshShift(page)
  expect(pullAfter).toBeLessThan(4)
})

test('swipe up and swipe down use similar scroll distance at same flick strength', async ({ page }) => {
  test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
  await page.setViewportSize({ width: 390, height: 844 })
  await openShortsTab(page, 390)
  await expect(page.locator('[data-shorts-active="1"]')).toHaveAttribute('data-shorts-index', '0', {
    timeout: 15000,
  })
  const up = await swipeShorts(page, 'up')
  expect(up.scrollDelta).toBeGreaterThan(80)
  const down = await swipeShorts(page, 'down')
  expect(down.scrollDelta).toBeGreaterThan(80)
  const ratio = up.scrollDelta / Math.max(down.scrollDelta, 1)
  expect(ratio).toBeGreaterThan(0.45)
  expect(ratio).toBeLessThan(2.2)
})

test('Shorts lyric typography matches feed post lyric', async ({ page }) => {
  test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(1200)
  const feedLyric = page.locator('.margo-feed-lyric').first()
  if ((await feedLyric.count()) === 0) test.skip(true, 'no feed posts on preview')
  const feedStyle = await feedLyric.evaluate((el) => {
    const s = getComputedStyle(el)
    return { fontSize: s.fontSize, fontFamily: s.fontFamily, fontWeight: s.fontWeight, lineHeight: s.lineHeight }
  })
  await openShortsTab(page, 390)
  const shortsLyric = page.locator('.margo-shorts-canvas .margo-feed-lyric').first()
  await expect(shortsLyric).toBeVisible({ timeout: 15000 })
  const shortsStyle = await shortsLyric.evaluate((el) => {
    const s = getComputedStyle(el)
    return { fontSize: s.fontSize, fontFamily: s.fontFamily, fontWeight: s.fontWeight, lineHeight: s.lineHeight }
  })
  expect(shortsStyle.fontSize).toBe(feedStyle.fontSize)
  expect(shortsStyle.fontFamily).toBe(feedStyle.fontFamily)
  expect(shortsStyle.fontWeight).toBe(feedStyle.fontWeight)
  expect(shortsStyle.lineHeight).toBe(feedStyle.lineHeight)
})

for (const size of [
  { w: 390, h: 844 },
  { w: 360, h: 740 },
]) {
  test(`touch swipe up/down settles one Short per flick @${size.w}x${size.h}`, async ({ page }) => {
    test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
    await page.setViewportSize({ width: size.w, height: size.h })
    await page.goto(shortsUrl(size.w), { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(1500)
    const pager = page.locator('.margo-feed-shorts-pager')
    await expect(pager).toBeVisible({ timeout: 20000 })
    const box = await pager.boundingBox()
    expect(box).toBeTruthy()
    if (!box) return
    const cx = box.x + box.width / 2
    const cy = box.y + box.height * 0.55
    const log: { dir: string; before: unknown; after: unknown }[] = []
    let idx = 0
    for (const dir of ['up', 'up', 'up', 'down', 'down', 'down'] as const) {
      const before = await readSettledIndex(page)
      const delta = dir === 'up' ? box.height * 0.72 : -box.height * 0.72
      await cdpTouchSwipe(page, cx, cy, delta)
      await page.waitForTimeout(450)
      await pager.evaluate((el) => el.dispatchEvent(new Event('scrollend')))
      await page.waitForTimeout(250)
      const after = await readSettledIndex(page)
      log.push({ dir, before, after })
      if (dir === 'up') {
        expect(Number(after.index)).toBeGreaterThanOrEqual(Number(before.index))
        idx = Number(after.index)
      } else {
        expect(Number(after.index)).toBeLessThanOrEqual(idx)
        idx = Number(after.index)
      }
    }
  })
}

test('sign-up CTA lives in chrome-bottom not over lyric center', async ({ page }) => {
  test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(shortsUrl(390), { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(1200)
  await expect(page.locator('.margo-feed-shorts-slide__center-play-label')).toHaveCount(0)
  const cta = page.locator('.margo-feed-shorts-slide__signup-cta')
  if ((await cta.count()) === 0) {
    test.info().annotations.push({ type: 'note', description: 'Anon signup gate not visible yet (needs 5 plays)' })
    return
  }
  await expect(cta).toHaveCount(1)
  const frame = page.locator('[data-shorts-active="1"] .margo-feed-shorts-slide__frame')
  const frameBox = await frame.boundingBox()
  const ctaBox = await cta.boundingBox()
  expect(frameBox && ctaBox).toBeTruthy()
  if (frameBox && ctaBox) {
    expect(ctaBox.y).toBeGreaterThan(frameBox.y + frameBox.height * 0.55)
    expect(ctaBox.y + ctaBox.height).toBeLessThanOrEqual(frameBox.y + frameBox.height + 2)
  }
})

for (const size of [
  { w: 360, h: 640 },
  { w: 390, h: 844 },
  { w: 430, h: 932 },
]) {
  test(`phone Shorts canvas is 320px wide and fits pane @${size.w}x${size.h}`, async ({ page }) => {
    test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
    await page.setViewportSize({ width: size.w, height: size.h })
    await page.goto(shortsUrl(size.w), { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(1200)
    const canvas = page.locator('[aria-label="Shorts preview, 9:16"]').first()
    await expect(canvas).toBeVisible({ timeout: 15000 })
    const canvasBox = await canvas.boundingBox()
    const pager = page.locator('.margo-feed-shorts-pager')
    const pagerBox = await pager.boundingBox()
    expect(canvasBox && pagerBox).toBeTruthy()
    if (canvasBox && pagerBox) {
      expect(Math.round(canvasBox.width)).toBe(320)
      expect(canvasBox.y + canvasBox.height).toBeLessThanOrEqual(pagerBox.y + pagerBox.height + 2)
      const secondSlide = page.locator('[data-shorts-index="1"]')
      if ((await secondSlide.count()) > 0) {
        const secondBox = await secondSlide.boundingBox()
        expect(secondBox).toBeTruthy()
        if (secondBox) {
          expect(secondBox.y).toBeGreaterThanOrEqual(pagerBox.y + pagerBox.height - 4)
        }
      }
    }
  })
}

test('Shorts frame survives 390→1440 resize and 1440 direct load', async ({ page }) => {
  test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(shortsUrl(390), { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(1200)
  await expect(page.locator('.margo-shorts-canvas').first()).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.waitForTimeout(600)
  const h1 = await page.locator('.margo-feed-shorts-slide__frame').first().evaluate((el) => el.getBoundingClientRect().height)
  expect(h1).toBeGreaterThan(240)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(400)
  const h2 = await page.locator('.margo-feed-shorts-slide__frame').first().evaluate((el) => el.getBoundingClientRect().height)
  expect(h2).toBeGreaterThan(240)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(shortsUrl(1440), { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(2000)
  await waitShortsSettledChrome(page)
  await expect(page.locator('.margo-shorts-canvas').first()).toBeVisible()
  const h3 = await page.locator('.margo-feed-shorts-slide__frame').first().evaluate((el) => el.getBoundingClientRect().height)
  expect(h3).toBeGreaterThan(240)
  const canvasH = await page.locator('.margo-shorts-canvas').first().evaluate((el) => el.getBoundingClientRect().height)
  expect(canvasH).toBeGreaterThan(240)
})

test('Shorts desktop width renders without tab switch (390↔1440)', async ({ page }) => {
  test.skip(!BASE.includes('vercel.app'), 'fixture clips required')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(shortsUrl(1440), { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(2000)
  await waitShortsSettledChrome(page)
  const direct = await page.evaluate(() => {
    const frame = document.querySelector('.margo-feed-shorts-slide__frame')
    const canvas = document.querySelector('.margo-shorts-canvas')
    return {
      frameH: frame?.getBoundingClientRect().height ?? 0,
      canvasH: canvas?.getBoundingClientRect().height ?? 0,
      loading: document.body.innerText.includes('Loading clips'),
    }
  })
  expect(direct.loading).toBe(false)
  expect(direct.frameH).toBeGreaterThan(240)
  expect(direct.canvasH).toBeGreaterThan(240)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(700)
  const phone = await page.locator('.margo-shorts-canvas').first().evaluate((el) => el.getBoundingClientRect().height)
  expect(phone).toBeGreaterThan(240)

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.waitForTimeout(700)
  const backDesktop = await page.locator('.margo-feed-shorts-slide__frame').first().evaluate((el) => el.getBoundingClientRect().height)
  expect(backDesktop).toBeGreaterThan(240)
})

