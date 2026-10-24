import { test, expect } from '@playwright/test'

test('new moments pill sits below tab bar and tabs stay on top', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.setContent(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    :root { --nav-height: 72px; --margo-feed-tab-bar-h: 40px; }
    .tabs { position: fixed; top: var(--nav-height); left: 0; right: 0; z-index: 41; height: var(--margo-feed-tab-bar-h); background: #111; display: flex; }
    .tab { flex: 1; min-height: 44px; border: none; background: #222; color: #fff; }
    .pill-wrap { position: fixed; top: calc(var(--nav-height) + var(--margo-feed-tab-bar-h) + 8px); left: 0; right: 0; z-index: 40; display: flex; justify-content: center; }
    .pill { pointer-events: auto; min-height: 36px; padding: 0 16px; background: gold; border: none; border-radius: 999px; }
  </style></head><body>
  <div class="tabs"><button type="button" class="tab" id="lyrics">Lyrics</button><button type="button" class="tab" id="shorts">Shorts</button></div>
  <div class="pill-wrap"><button type="button" class="pill" id="pill">New</button></div>
  </body></html>`, { waitUntil: 'domcontentloaded' })
  const tabBox = await page.locator('#lyrics').boundingBox()
  const pillBox = await page.locator('#pill').boundingBox()
  expect(tabBox).toBeTruthy()
  expect(pillBox).toBeTruthy()
  if (tabBox && pillBox) {
    expect(pillBox.y).toBeGreaterThan(tabBox.y + tabBox.height - 2)
  }
  const top = await page.evaluate(() => {
    const tab = document.getElementById('lyrics')
    if (!tab) return null
    const r = tab.getBoundingClientRect()
    const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return t?.id || null
  })
  expect(top).toBe('lyrics')
})
