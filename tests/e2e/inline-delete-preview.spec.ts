import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const OUT = '/opt/cursor/artifacts/screenshots'

function feedCardWithDelete(opts: {
  inline: boolean
  target: 'moment' | 'lyric-back'
  nearBottom?: boolean
}) {
  const css = fs.readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8')
  const block = [
    css.match(/\.margo-inline-delete-scrim[\s\S]*?\.margo-inline-delete-panel__confirm[\s\S]*?\}/)?.[0],
    css.match(/\.margo-inline-delete-focus-anchor[\s\S]*?\}/)?.[0],
    css.match(/\.margo-post-delete-inline-host[\s\S]*?\}/)?.[0],
  ].filter(Boolean).join('\n')
  const popupBlock = `
    .popup-scrim { position:fixed; inset:0; z-index:100; background:rgba(7,6,10,0.85); backdrop-filter:blur(8px); }
    .popup-dlg { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:101; width:min(340px,calc(100% - 48px)); padding:18px 16px; background:#0f0e14; border-radius:20px; text-align:center; }
  `
  const title = opts.target === 'moment' ? 'Delete this Moment?' : 'Delete this Lyric Back?'
  const panel = `
    <div class="margo-inline-delete-panel" role="dialog">
      <p class="margo-inline-delete-panel__title">${title}</p>
      <p class="margo-inline-delete-panel__body">This can't be undone.</p>
      <div class="margo-inline-delete-panel__actions">
        <button type="button" class="margo-inline-delete-panel__cancel">Cancel</button>
        <button type="button" class="margo-inline-delete-panel__confirm">Delete</button>
      </div>
    </div>`
  const spacer = opts.nearBottom ? '<div style="height:520px"></div>' : ''
  if (opts.inline) {
    return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>
      body { margin:0; background:#111; color:#eee; font-family:system-ui,sans-serif; }
      .card { margin:12px; padding:12px; background:#1a1a1e; border-radius:16px; }
      ${block}
    </style></head><body>${spacer}
      <div class="margo-inline-delete-scrim"></div>
      <div class="card margo-inline-delete-focus-anchor">
        <p>Post lyric line here</p>
        <div class="margo-post-delete-inline-host" data-delete-inline-host="p1">${panel}</div>
      </div>
      <div style="height:80px;background:#222;margin:12px;border-radius:16px">Bottom nav area</div>
    </body></html>`
  }
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>${popupBlock}</style></head><body>
    ${spacer}
    <div class="card" style="margin:12px;padding:12px;background:#1a1a1e;border-radius:16px"><p>Post behind popup</p></div>
    <div class="popup-scrim"></div>
    <div class="popup-dlg"><p style="font-style:italic;font-size:1.0625rem">${title}</p><p style="font-size:0.8125rem;color:#aaa">This can't be undone.</p></div>
  </body></html>`
}

test.describe('inline delete preview @390', () => {
  test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }))

  test('feed moment — inline under post', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setContent(feedCardWithDelete({ inline: true, target: 'moment' }), { waitUntil: 'domcontentloaded' })
    await page.screenshot({ path: `${OUT}/inline-delete-feed-moment-390.png`, fullPage: true })
    await expect(page.locator('.margo-inline-delete-panel__confirm')).toBeVisible()
  })

  test('lyric back — inline under row', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setContent(feedCardWithDelete({ inline: true, target: 'lyric-back' }), { waitUntil: 'domcontentloaded' })
    await page.screenshot({ path: `${OUT}/inline-delete-lb-row-390.png`, fullPage: true })
  })

  test('post thread — inline near bottom', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setContent(feedCardWithDelete({ inline: true, target: 'moment', nearBottom: true }), { waitUntil: 'domcontentloaded' })
    await page.locator('.margo-inline-delete-focus-anchor').scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${OUT}/inline-delete-post-near-bottom-390.png`, fullPage: true })
    const box = await page.locator('.margo-inline-delete-panel__confirm').boundingBox()
    expect(box).toBeTruthy()
    if (box) expect(box.y + box.height).toBeLessThanOrEqual(844)
  })

  test('compare popup (current default) vs inline', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setContent(feedCardWithDelete({ inline: false, target: 'moment' }), { waitUntil: 'domcontentloaded' })
    await page.screenshot({ path: `${OUT}/popup-delete-current-390.png`, fullPage: true })
  })
})
