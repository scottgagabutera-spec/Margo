import { test, expect } from '@playwright/test'

/**
 * Proves full-viewport delete scrim (PostFocusedDeleteDialog pattern) blocks card/LB taps;
 * restored delete uses a separate dialog layer only while open — card nav works when closed.
 */
const FIXTURE = String.raw`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body { margin: 0; font-family: system-ui, sans-serif; background: #111; color: #eee; padding: 16px; }
  .margo-post-card { padding: 16px; border: 1px solid #333; border-radius: 12px; cursor: pointer; }
  .margo-lb-thread-row__lyric { display: block; width: 100%; text-align: left; padding: 12px; border: 1px solid #444; background: #1a1a1a; color: #eee; cursor: pointer; }
  .margo-delete-focus-scrim {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(7, 6, 10, 0.88);
    backdrop-filter: blur(6px);
  }
</style></head><body>
<div class="margo-post-card" id="feed-card" data-testid="feed-card">Feed moment</div>
<button type="button" class="margo-lb-thread-row__lyric" id="lb-lyric" data-testid="lb-lyric">&ldquo;Lyric back line&rdquo;</button>
<script>
  document.getElementById('feed-card').addEventListener('click', () => {
    document.body.dataset.feedNav = '1';
  });
  document.getElementById('lb-lyric').addEventListener('click', () => {
    document.body.dataset.lbNav = '1';
  });
  window.__openBrokenDeleteScrim = () => {
    const el = document.createElement('div');
    el.className = 'margo-delete-focus-scrim';
    el.id = 'broken-scrim';
    document.body.appendChild(el);
  };
  window.__closeBrokenDeleteScrim = () => {
    document.getElementById('broken-scrim')?.remove();
  };
</script>
</body></html>`

for (const width of [360, 390, 430]) {
  test(`feed card and LB lyric open thread when no delete scrim (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(FIXTURE, { waitUntil: 'domcontentloaded' })
    await page.getByTestId('feed-card').click()
    await page.getByTestId('lb-lyric').click()
    await expect.poll(async () => page.evaluate(() => document.body.dataset.feedNav)).toBe('1')
    await expect.poll(async () => page.evaluate(() => document.body.dataset.lbNav)).toBe('1')
  })

  test(`broken delete scrim blocks taps (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(FIXTURE, { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => {
      (window as unknown as { __openBrokenDeleteScrim: () => void }).__openBrokenDeleteScrim()
    })
    await page.getByTestId('feed-card').click({ force: true })
    await page.getByTestId('lb-lyric').click({ force: true })
    await expect.poll(async () => page.evaluate(() => document.body.dataset.feedNav)).toBeUndefined()
    await expect.poll(async () => page.evaluate(() => document.body.dataset.lbNav)).toBeUndefined()
  })
}
