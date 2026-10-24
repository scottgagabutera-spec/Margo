import { test, expect } from '@playwright/test'

test('lyric zone stays tappable when LB panel open on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const css = `
    @media (max-width: 639px) {
      .card[data-lb-panel-open='1'] > .body { pointer-events: none; max-height: 56px; overflow: hidden; }
      .card[data-lb-panel-open='1'] > .body .lyric-zone { pointer-events: auto; cursor: pointer; }
    }
  `
  await page.setContent(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>${css}</style></head>
  <body><div class="card" data-lb-panel-open="1"><div class="body"><div class="lyric-zone" id="lyric">Keep bleeding</div></div><div class="panel">LB panel</div></div>
  <script>
    lyric.onclick = () => { location.hash = 'thread' }
  </script></body></html>`, { waitUntil: 'domcontentloaded' })
  await page.locator('#lyric').click()
  await expect(page).toHaveURL(/#thread/)
})
