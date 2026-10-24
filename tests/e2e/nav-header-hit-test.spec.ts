import { test, expect } from '@playwright/test'

/** Matches MargoNav: nav passes through except interactive row. */
const NAV = `<nav style="position:fixed;top:0;left:0;right:0;z-index:50;padding:14px 24px;background:#07060A;pointer-events:none">
  <div style="display:flex;justify-content:space-between;align-items:center;pointer-events:none;width:100%">
    <a id="logo" href="/" style="pointer-events:auto;width:44px;height:44px;display:flex;align-items:center;justify-content:center;flex-shrink:0">M</a>
    <span style="width:44px;height:44px;flex-shrink:0"></span>
  </div>
</nav>`

const NAV_BACK = `<nav style="position:fixed;top:0;left:0;right:0;z-index:50;padding:14px 24px;background:#07060A;pointer-events:none">
  <div style="display:flex;justify-content:space-between;pointer-events:auto">
    <a id="back" href="/feed" style="width:44px;height:44px;display:flex;align-items:center;justify-content:center">←</a>
    <span style="width:44px;height:44px"></span>
  </div>
</nav>`

async function topId(page: import('@playwright/test').Page, x: number, y: number) {
  return page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y)
    return el?.id || el?.tagName || null
  }, { x, y })
}

for (const width of [360, 390, 430]) {
  test(`feed: lyric under nav passes through to card (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(`<!DOCTYPE html><body style="margin:0;background:#111">
      ${NAV}
      <div style="padding-top:72px">
        <button id="lyric" type="button" style="width:100%;min-height:120px;margin-top:-40px;padding-top:52px;text-align:left;background:#1a1a1e;border:none;color:#fff">Keep bleeding</button>
      </div>
    </body>`, { waitUntil: 'domcontentloaded' })
    const cx = Math.floor(width / 2)
    const topBefore = await topId(page, cx, 56)
    expect(topBefore).toBe('lyric')
  })

  test(`post: back control is hit target, not logo (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(`<!DOCTYPE html><body style="margin:0">${NAV_BACK}</body>`, { waitUntil: 'domcontentloaded' })
    const top = await topId(page, 36, 36)
    expect(top).toBe('back')
  })
}
