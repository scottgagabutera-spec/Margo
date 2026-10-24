import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const OUT = '/opt/cursor/artifacts/screenshots'

test('edit panel compact @390', async ({ page }) => {
  fs.mkdirSync(OUT, { recursive: true })
  const css = fs.readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8')
  const block = css.match(/\.margo-post-moment-edit[\s\S]*?\.margo-post-moment-edit__save:disabled[\s\S]*?\}/)?.[0] ?? ''
  await page.setViewportSize({ width: 390, height: 844 })
  await page.setContent(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>${block}
    .margo-post-edit-vibe-only-hint{display:block;margin:0 0 6px;font-size:0.625rem;font-weight:600;text-transform:uppercase;color:#888}
    .margo-post-edit-locked-fields{opacity:0.52}
  </style></head><body style="margin:0;background:#111;color:#eee">
  <div class="margo-post-moment-edit">
    <div class="margo-post-moment-edit__head">
      <span class="margo-post-moment-edit__title">Edit</span>
      <div class="margo-post-moment-edit__actions">
        <button type="button" class="margo-post-moment-edit__cancel">Cancel</button>
        <button type="button" class="margo-post-moment-edit__save">Save</button>
      </div>
    </div>
    <span class="margo-post-edit-vibe-only-hint">Vibe only</span>
    <div class="margo-post-edit-locked-fields"><p style="padding:12px">Song + lyric dimmed</p></div>
  </div></body></html>`, { waitUntil: 'domcontentloaded' })
  await page.screenshot({ path: `${OUT}/edit-panel-compact-after-390.png`, fullPage: true })
  await expect(page.getByText('Vibe only')).toBeVisible()
})
