import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const OUT = '/opt/cursor/artifacts/screenshots'

/** Reproduces trapped fixed dialog inside isolated card (pre-portal bug pattern). */
const TRAPPED = String.raw`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body { margin: 0; background: #111; font-family: system-ui, sans-serif; }
  .feed { padding: 12px; }
  .card { position: relative; isolation: isolate; z-index: 20; margin-bottom: 12px; padding: 16px; background: #1a1a1e; border-radius: 16px; min-height: 120px; }
  .card--cover { z-index: 25; background: #252530; min-height: 200px; }
  .dlg { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 101; width: 280px; padding: 16px; background: #0f0e14; border-radius: 16px; }
  .dlg button { min-height: 44px; width: 100%; margin-top: 8px; }
</style></head><body>
<div class="feed">
  <div class="card" id="owner">
    <p>Moment with delete open (trapped in card stack)</p>
    <div class="dlg" id="dialog">
      <p>Delete?</p>
      <button type="button" id="cancel">Cancel</button>
      <button type="button" id="confirm">Delete</button>
    </div>
  </div>
  <div class="card card--cover" id="cover">Later feed card paints above</div>
</div>
</body></html>`

const PORTALED = String.raw`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body { margin: 0; background: #111; font-family: system-ui, sans-serif; }
  .feed { padding: 12px; }
  .card { position: relative; isolation: isolate; z-index: 20; margin-bottom: 12px; padding: 16px; background: #1a1a1e; border-radius: 16px; min-height: 120px; }
  .card--cover { z-index: 25; background: #252530; min-height: 200px; }
  .scrim { position: fixed; inset: 0; z-index: 100; background: rgba(7,6,10,0.85); }
  .dlg { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 101; width: 280px; padding: 16px; background: #0f0e14; border-radius: 16px; }
  .dlg button { min-height: 44px; width: 100%; margin-top: 8px; }
</style></head><body>
<div class="scrim"></div>
<div class="dlg" id="dialog">
  <p>Delete?</p>
  <button type="button" id="cancel">Cancel</button>
  <button type="button" id="confirm">Delete</button>
</div>
<div class="feed">
  <div class="card" id="owner"><p>Moment card</p></div>
  <div class="card card--cover" id="cover">Later feed card</div>
</div>
</body></html>`

async function topElementIdAtButton(page: import('@playwright/test').Page, selector: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = r.top + r.height / 2
    const top = document.elementFromPoint(x, y)
    return top?.id || top?.tagName || null
  }, selector)
}

for (const width of [360, 390]) {
  test(`trapped dialog — Cancel can be covered by later card (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(TRAPPED, { waitUntil: 'domcontentloaded' })
    await page.locator('#owner').scrollIntoViewIfNeeded()
    const top = await topElementIdAtButton(page, '#cancel')
    expect(top).not.toBe('cancel')
  })

  test(`portaled dialog — Cancel and Delete on top (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(PORTALED, { waitUntil: 'domcontentloaded' })
    await page.locator('#owner').scrollIntoViewIfNeeded()
    await expect(await topElementIdAtButton(page, '#cancel')).toBe('cancel')
    await expect(await topElementIdAtButton(page, '#confirm')).toBe('confirm')
    const cancelBox = await page.locator('#cancel').boundingBox()
    const confirmBox = await page.locator('#confirm').boundingBox()
    expect(cancelBox).toBeTruthy()
    expect(confirmBox).toBeTruthy()
    if (cancelBox && confirmBox) {
      expect(cancelBox.y + cancelBox.height).toBeLessThanOrEqual(844)
      expect(confirmBox.y + confirmBox.height).toBeLessThanOrEqual(844)
    }
  })
}

test.describe('delete copy screenshots @390', () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUT, { recursive: true })
  })

  test('compact delete — moment and lyric-back side by side', async ({ page }) => {
    const css = fs.readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8')
    const html = fs.readFileSync(path.join(process.cwd(), 'components/delete-moment-dialog.tsx'), 'utf8')
    void css
    void html
    const panel = (title: string) => `
      <div style="position:absolute;inset:0;background:rgba(7,6,10,0.85);backdrop-filter:blur(8px)"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(340px,calc(100% - 48px));padding:18px 16px;background:#0f0e14;border-radius:20px;text-align:center;box-sizing:border-box">
        <p style="font-style:italic;font-size:1.0625rem;margin:0 0 6px">${title}</p>
        <p style="font-size:0.8125rem;color:#aaa;margin:0 0 16px">This can't be undone.</p>
        <div style="display:flex;gap:8px"><button style="flex:1;min-height:44px;border-radius:50px;font-size:0.75rem">Cancel</button><button style="flex:1;min-height:44px;border-radius:50px;background:#ff6060;border:none;font-size:0.75rem">Delete</button></div>
      </div>`
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setContent(`<!DOCTYPE html><body style="margin:0;display:grid;grid-template-columns:1fr 1fr;width:390px;height:844px"><div style="position:relative;border-right:1px solid #333">${panel('Delete this Moment?')}</div><div style="position:relative">${panel('Delete this Lyric Back?')}</div></body>`, { waitUntil: 'domcontentloaded' })
    await page.screenshot({ path: `${OUT}/delete-compact-side-by-side-390.png`, fullPage: true })
  })
})
