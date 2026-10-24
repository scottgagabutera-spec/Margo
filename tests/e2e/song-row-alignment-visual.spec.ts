import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const OUT = '/opt/cursor/artifacts/screenshots'

const BEFORE = String.raw`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body { margin: 0; background: #111; color: #eee; font-family: system-ui, sans-serif; padding: 12px; }
  .row-bad { display: flex; align-items: baseline; gap: 0; padding: 4px; border: 1px solid #333; border-radius: 10px; }
  .art { width: 36px; height: 36px; border-radius: 7px; background: #333; flex-shrink: 0; }
  .meta { flex: 1; min-width: 0; }
  .title { font-size: 13px; font-weight: 600; }
  .artist { font-size: 12px; color: #888; margin-top: 8px; }
</style></head><body>
<p>Edit panel song row (before)</p>
<div class="row-bad"><div class="art"></div><div class="meta"><div class="title">Song Title Here</div><div class="artist">Artist Name</div></div></div>
</body></html>`

test.describe('song row alignment @390', () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUT, { recursive: true })
  })

  test('before — misaligned baseline row', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 400 })
    await page.setContent(BEFORE, { waitUntil: 'domcontentloaded' })
    await page.screenshot({ path: `${OUT}/song-row-edit-before-390.png` })
  })

  test('after — shared margo-song-row chip', async ({ page }) => {
    const css = fs.readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8')
    const block = css.match(/\.margo-song-row[\s\S]*?\.margo-song-row__trail[\s\S]*?\}/)?.[0] ?? ''
    const chip = css.match(/\.margo-post-card__lb-compose-track--chip[\s\S]*?min-height: 44px;\n\}/)?.[0] ?? ''
    await page.setViewportSize({ width: 390, height: 400 })
    await page.setContent(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>${block}${chip}</style></head><body style="margin:0;background:#111;color:#eee;padding:12px;font-family:system-ui,sans-serif"><p>Edit panel song row (after)</p><div class="margo-song-row margo-post-card__lb-compose-track--chip"><div class="margo-song-row__art margo-song-row__art--empty"></div><div class="margo-song-row__meta"><span class="margo-song-row__title">Song Title Here</span><span class="margo-song-row__artist">Artist Name</span></div><div class="margo-song-row__trail"><span style="width:28px;height:28px;border:1px solid #444;border-radius:50%"></span></div></div></body></html>`, { waitUntil: 'domcontentloaded' })
    await page.screenshot({ path: `${OUT}/song-row-edit-after-390.png` })
    await expect(page.locator('.margo-song-row')).toBeVisible()
  })
})
