import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const OUT = '/opt/cursor/artifacts/screenshots'

/** Shared chrome from components/delete-moment-dialog.tsx (inline styles), scoped to column. */
function deleteDialogColumn(title: string, body: string): string {
  return `
<div style="position:absolute;inset:0;z-index:1;background:rgba(7,6,10,0.85);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);"></div>
<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2;width:min(170px,calc(50vw - 24px));background:#0f0e14;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:20px 14px;text-align:center;box-sizing:border-box;">
  <p style="font-family:var(--font-lora),Georgia,serif;font-style:italic;font-size:1.05rem;color:#eee;margin:0 0 8px;">${title}</p>
  <p style="font-family:var(--font-lora),Georgia,serif;font-size:0.72rem;color:#aaa;margin:0 0 16px;line-height:1.45;">${body}</p>
  <div style="display:flex;gap:8px;">
    <button type="button" style="flex:1;padding:10px;min-height:44px;box-sizing:border-box;background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:50px;color:#aaa;font-size:0.55rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Cancel</button>
    <button type="button" style="flex:1;padding:10px;min-height:44px;box-sizing:border-box;background:#ff6060;border:none;border-radius:50px;color:#07060A;font-size:0.55rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Delete</button>
  </div>
</div>`
}

const SIDE_BY_SIDE = (momentBody: string, lbBody: string) => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body { margin: 0; background: #07060a; color: #eee; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; width: 390px; min-height: 844px; }
  .col { position: relative; min-height: 844px; border-right: 1px solid #222; }
  .col:last-child { border-right: none; }
  .label { position: absolute; top: 8px; left: 8px; z-index: 102; font: 600 10px system-ui; color: #888; text-transform: uppercase; letter-spacing: 0.06em; }
</style></head><body>
<div class="grid">
  <div class="col" id="feed-col">
    <span class="label">Feed moment</span>
    ${deleteDialogColumn('Delete this Moment?', momentBody)}
  </div>
  <div class="col" id="lb-col">
    <span class="label">Lyric Back row</span>
    ${deleteDialogColumn('Delete this Lyric Back?', lbBody)}
  </div>
</div>
</body></html>`

function lbVibeFixture(): string {
  const css = fs.readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8')
  const vibeBlock = css.match(/\.margo-lb-thread-row--reply[\s\S]*?\.margo-lb-thread-row--anchor[\s\S]*?\}/)?.[0] ?? ''
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body { margin: 0; background: #07060a; color: #eee; font-family: system-ui, sans-serif; padding: 12px; }
  ${vibeBlock}
  .wrap { display: flex; flex-direction: column; gap: 10px; }
</style></head><body>
<div class="wrap">
  <article class="margo-lb-thread-row margo-lb-thread-row--reply" style="--post-vibe-border: rgba(120,200,255,0.45); --post-vibe-faint: rgba(120,200,255,0.08); --post-vibe-fill: rgba(120,200,255,0.2); --surface: #121216;"><p>Chill vibe row</p></article>
  <article class="margo-lb-thread-row margo-lb-thread-row--reply" style="--post-vibe-border: rgba(255,180,100,0.5); --post-vibe-faint: rgba(255,180,100,0.1); --post-vibe-fill: rgba(255,180,100,0.22); --surface: #121216;"><p>Joy vibe row</p></article>
  <article class="margo-lb-thread-row margo-lb-thread-row--content-removed margo-lb-thread-row--reply"><p class="margo-lb-thread-row__lyric--removed">Deleted</p></article>
</div>
</body></html>`
}

test.describe('delete UI screenshots @390', () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUT, { recursive: true })
  })

  test('feed vs LB delete dialogs side by side (same chrome)', async ({ page }) => {
    const momentBody = 'This can\u2019t be undone. It will be removed from Feed, your profile, and anywhere else it appears.'
    const lbBody = 'This can\u2019t be undone. If others replied below, the row may stay as a shell.'
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setContent(SIDE_BY_SIDE(momentBody, lbBody), { waitUntil: 'domcontentloaded' })
    await page.screenshot({ path: `${OUT}/delete-feed-vs-lb-side-by-side-390.png`, fullPage: true })
    await expect(page.locator('#feed-col')).toBeVisible()
    await expect(page.locator('#lb-col')).toBeVisible()
  })

  test('LB vibe rows + neutral shell @390', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setContent(lbVibeFixture(), { waitUntil: 'domcontentloaded' })
    await page.screenshot({ path: `${OUT}/lb-vibe-rows-390.png`, fullPage: true })
  })
})
