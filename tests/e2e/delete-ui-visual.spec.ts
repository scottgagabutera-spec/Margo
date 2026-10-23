import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const OUT = '/opt/cursor/artifacts/screenshots'

/** Matches components/delete-moment-dialog.tsx scrim + panel (pre-#280 feed delete). */
const FEED_DELETE_ORIGINAL = String.raw`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body { margin: 0; background: #07060a; color: #eee; font-family: Georgia, serif; }
  .feed-bg { padding: 12px; min-height: 120vh; background: linear-gradient(#111,#0a0a0c); }
  .card { margin: 12px 0; padding: 16px; border-radius: 16px; border: 1px solid #333; background: #151518; }
  .card--dim { opacity: 0.35; filter: blur(1px); }
</style></head><body>
<div class="feed-bg">
  <div class="card card--dim">Other post above</div>
  <div class="card" id="target">Target moment — stays in place</div>
  <div class="card card--dim">Other post below</div>
</div>
<div style="position:fixed;inset:0;z-index:100;background:rgba(7,6,10,0.85);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);"></div>
<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:101;width:min(380px,calc(100vw - 48px));background:#0f0e14;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:28px 24px;text-align:center;box-sizing:border-box;">
  <p style="font-style:italic;font-size:1.15rem;margin:0 0 8px;">Delete this Moment?</p>
  <p style="font-size:0.78rem;color:#aaa;margin:0 0 22px;line-height:1.5;">This can't be undone.</p>
  <div style="display:flex;gap:10px;"><button style="flex:1;min-height:44px;border-radius:50px;">Cancel</button><button style="flex:1;min-height:44px;border-radius:50px;background:#ff6060;border:none;">Delete</button></div>
</div>
</body></html>`

/** Matches de987cc .margo-delete-focus-scrim (removed on #282 restore). */
const FEED_DELETE_DE987CC = String.raw`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body { margin: 0; background: #07060a; color: #eee; font-family: system-ui, sans-serif; }
  .feed-bg { padding: 12px; min-height: 120vh; }
  .card { margin: 12px 0; padding: 16px; border-radius: 16px; border: 1px solid #333; background: #151518; }
  .margo-delete-focus-anchor { position: relative; z-index: 201; }
  .margo-delete-focus-scrim { position: fixed; inset: 0; z-index: 200; background: rgba(7, 6, 10, 0.88); backdrop-filter: blur(6px); }
  .panel { margin: 12px; padding: 18px; border-radius: 16px; background: #141318; border: 1px solid #333; }
</style></head><body>
<div class="margo-delete-focus-scrim"></div>
<div class="feed-bg">
  <div class="card">Other post</div>
  <div class="card margo-delete-focus-anchor" id="target">
    Target moment
    <div class="panel">Delete confirm inline</div>
  </div>
  <div class="card">Other post</div>
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

  test('feed delete — original pre-#280 (9833c08 DeleteMomentDialog)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setContent(FEED_DELETE_ORIGINAL, { waitUntil: 'domcontentloaded' })
    await page.screenshot({ path: `${OUT}/delete-feed-original-390.png`, fullPage: true })
    await expect(page.locator('#target')).toBeVisible()
  })

  test('feed delete — de987cc PostFocusedDeleteDialog (regression reference)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setContent(FEED_DELETE_DE987CC, { waitUntil: 'domcontentloaded' })
    await page.screenshot({ path: `${OUT}/delete-feed-de987cc-390.png`, fullPage: true })
  })

  test('feed delete — restored (same as original fixture)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setContent(FEED_DELETE_ORIGINAL, { waitUntil: 'domcontentloaded' })
    await page.screenshot({ path: `${OUT}/delete-feed-restored-390.png`, fullPage: true })
  })

  test('LB vibe rows + neutral shell @390', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setContent(lbVibeFixture(), { waitUntil: 'domcontentloaded' })
    await page.screenshot({ path: `${OUT}/lb-vibe-rows-390.png`, fullPage: true })
  })
})
