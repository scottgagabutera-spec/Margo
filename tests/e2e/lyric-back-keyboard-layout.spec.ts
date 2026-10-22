import { test, expect } from '@playwright/test'

const FIXTURE = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  html, body { margin: 0; padding: 0; overflow-x: hidden; background: #111; }
  .pane { width: 100%; overflow-x: hidden; overflow-y: auto; height: 100vh; }
  .margo-post-card__lb-panel {
    box-sizing: border-box;
    width: 100%;
    margin: 0;
    padding: 12px;
    background: #222;
    display: flex;
    flex-direction: column;
    max-height: 480px;
    position: relative;
    z-index: 12;
  }
  .margo-lb-focus { display: flex; flex-direction: column; min-height: 0; flex: 1; overflow: hidden; }
  .margo-lb-focus__chrome { flex-shrink: 0; border-bottom: 1px solid #333; }
  .margo-lb-focus__scroll {
    flex: 1 1 auto; min-height: 0; overflow-x: hidden; overflow-y: auto;
    overscroll-behavior: contain; touch-action: pan-y;
  }
  .margo-search--lb-panel {
    width: 100%; height: 38px; font-size: 16px; box-sizing: border-box;
  }
</style>
</head>
<body>
<div class="pane" id="pane">
  <div class="margo-post-card__lb-panel" id="panel">
    <div class="margo-lb-focus">
      <div class="margo-lb-focus__chrome">
        <input id="search" class="margo-search--lb-panel" type="search" placeholder="Search" />
      </div>
      <div class="margo-lb-focus__scroll" id="list">
        <p style="height:1200px;margin:0;color:#ccc">replies</p>
      </div>
    </div>
  </div>
</div>
<script>
  const panel = document.getElementById('panel');
  const search = document.getElementById('search');
  const vv = window.visualViewport;
  function capPanel() {
    if (!vv) return;
    const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    if (inset < 80) {
      panel.style.maxHeight = '';
      panel.removeAttribute('data-lb-keyboard');
      return;
    }
    const top = panel.getBoundingClientRect().top;
    const cap = Math.max(200, vv.height + vv.offsetTop - top - 8);
    panel.style.maxHeight = cap + 'px';
    panel.setAttribute('data-lb-keyboard', '1');
  }
  vv?.addEventListener('resize', capPanel);
  vv?.addEventListener('scroll', capPanel);
  search.addEventListener('focus', () => {
    try { search.focus({ preventScroll: true }); } catch (_) {}
    capPanel();
  });
</script>
</body>
</html>`

async function scrollSnapshots(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const panel = document.getElementById('panel')
    const pane = document.getElementById('pane')
    const list = document.getElementById('list')
    const box = panel?.getBoundingClientRect()
    return {
      pane: pane ? { scrollLeft: pane.scrollLeft, scrollTop: pane.scrollTop } : null,
      list: list ? { scrollLeft: list.scrollLeft, scrollTop: list.scrollTop } : null,
      doc: { scrollLeft: document.documentElement.scrollLeft, scrollTop: document.documentElement.scrollTop },
      panel: box
        ? { left: Math.round(box.left), top: Math.round(box.top), width: Math.round(box.width) }
        : null,
    }
  })
}

for (const width of [360, 390, 430]) {
  test.describe(`width ${width}`, () => {
    test('search focus does not shift panel horizontally under simulated keyboard', async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await page.setContent(FIXTURE, { waitUntil: 'domcontentloaded' })

      const before = await scrollSnapshots(page)

      await page.evaluate(() => {
        const vv = window.visualViewport
        if (!vv) return
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 })
        Object.defineProperty(vv, 'height', { configurable: true, value: 380 })
        Object.defineProperty(vv, 'offsetTop', { configurable: true, value: 0 })
        vv.dispatchEvent(new Event('resize'))
      })

      await page.locator('#search').click()
      await page.waitForTimeout(80)

      const after = await scrollSnapshots(page)

      expect(before.panel?.left ?? 0).toBe(after.panel?.left ?? 0)
      expect(before.pane?.scrollLeft ?? 0).toBe(after.pane?.scrollLeft ?? 0)
      expect(before.doc.scrollLeft).toBe(after.doc.scrollLeft)
      expect(after.panel?.width).toBe(width)
    })
  })
}
