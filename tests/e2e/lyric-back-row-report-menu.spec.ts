import { test, expect } from '@playwright/test'

const FIXTURE = String.raw`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body { margin: 0; background: #111; color: #eee; font-family: system-ui, sans-serif; }
  .margo-lb-thread-row__header { display: flex; align-items: flex-start; gap: 8px; padding: 12px; }
  .margo-post-report-menu { position: relative; flex-shrink: 0; }
  .margo-post-report-menu__trigger {
    width: 44px; height: 44px; border: 0; background: #222; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .margo-lb-thread-row__more .margo-post-report-menu__panel {
    position: absolute; bottom: 100%; right: 0; margin-bottom: 6px; z-index: 40;
    min-width: 160px; padding: 6px; border-radius: 12px; background: #1a1a1a;
    border: 1px solid #444; box-shadow: 0 8px 24px rgba(0,0,0,0.6);
  }
  .margo-post-report-menu__item {
    display: block; width: 100%; min-height: 44px; padding: 12px 14px;
    border: 0; background: #1a1a1a; color: #eee; text-align: left; box-sizing: border-box;
  }
  #lyric { width: calc(100% - 24px); margin: 0 12px; min-height: 52px; padding: 8px 10px; box-sizing: border-box; }
  .margo-post-card__lb-compose-send-row { display: flex; justify-content: flex-end; min-height: 44px; padding: 0 12px 12px; }
  #send { width: 44px; height: 44px; border: 0; border-radius: 50%; background: #d4a017; }
  .actions { display: flex; gap: 8px; padding: 8px 12px 16px; font-size: 12px; color: #aaa; }
</style></head><body>
<article class="margo-lb-thread-row">
  <header class="margo-lb-thread-row__header">
    <div style="flex:1">Author</div>
    <div class="margo-post-report-menu margo-lb-thread-row__more" id="more-wrap">
      <button type="button" id="more" class="margo-post-report-menu__trigger" aria-expanded="false" aria-haspopup="menu">⋯</button>
      <div id="menu" class="margo-post-report-menu__panel" hidden role="menu">
        <button type="button" role="menuitem" class="margo-post-report-menu__item">Report</button>
      </div>
    </div>
  </header>
  <textarea id="lyric" rows="2">Sample Lyric Back line</textarea>
  <div class="margo-post-card__lb-compose-send-row"><button type="button" id="send">S</button></div>
  <div class="actions">Resonate · Lyric Back · Card · Repost</div>
</article>
<script>
  const more = document.getElementById('more');
  const menu = document.getElementById('menu');
  more.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    more.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
</script>
</body></html>`

for (const width of [360, 390]) {
  test(`report menu does not cover lyric or send (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(FIXTURE, { waitUntil: 'domcontentloaded' })
    await page.locator('#more').click()
    await expect(page.locator('#menu')).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Report' })).toBeVisible()

    const layout = await page.evaluate(() => {
      const menu = document.getElementById('menu')!.getBoundingClientRect()
      const lyric = document.getElementById('lyric')!.getBoundingClientRect()
      const send = document.getElementById('send')!.getBoundingClientRect()
      const actions = document.querySelector('.actions')!.getBoundingClientRect()
      const overlaps = (a: DOMRect, b: DOMRect) =>
        !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom)
      return {
        menuBottom: menu.bottom,
        lyricTop: lyric.top,
        sendTop: send.top,
        actionsTop: actions.top,
        hitsLyric: overlaps(menu, lyric),
        hitsSend: overlaps(menu, send),
        hitsActions: overlaps(menu, actions),
      }
    })
    expect(layout.hitsLyric).toBe(false)
    expect(layout.hitsSend).toBe(false)
    expect(layout.hitsActions).toBe(false)
    expect(layout.menuBottom).toBeLessThanOrEqual(layout.lyricTop + 2)
  })
}
