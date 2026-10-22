import { test, expect } from '@playwright/test'
import { firstRowClearsPinnedBar } from '../../lib/lyric-back-scroll-metrics.ts'

const FIXTURE = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  html, body { margin: 0; padding: 0; overflow-x: hidden; background: #111; color: #eee; }
  .pane { width: 100%; overflow-x: hidden; overflow-y: auto; height: 100vh; }
  .margo-post-card__lb-panel {
    box-sizing: border-box; width: 100%; margin: 0; padding: 8px 12px;
    background: #222; display: flex; flex-direction: column; max-height: 520px;
    position: relative; z-index: 12;
  }
  .margo-lb-focus {
    --lb-pin-gap: 8px;
    display: flex; flex-direction: column; min-height: 0; flex: 1; overflow: hidden;
  }
  .margo-lb-focus__chrome { flex-shrink: 0; border-bottom: 1px solid #333; }
  .margo-lb-focus__bar {
    display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 8px 0; box-sizing: border-box;
  }
  .margo-lb-focus__search-wrap { flex: 1 1 140px; min-width: 0; }
  .margo-lb-focus__chip, .margo-lb-focus__back-chip {
    height: 28px; padding: 0 8px; border-radius: 999px; border: 1px solid #444; background: #1a1a1a;
    color: #ccc; font-size: 11px;
  }
  .margo-lb-focus__count { font-size: 12px; color: #999; }
  .margo-post-card__lb-close { width: 32px; height: 32px; border: 0; background: none; color: #aaa; }
  .margo-search--lb-panel {
    width: 100%; height: 36px; font-size: 14px; box-sizing: border-box;
    border: 1px solid #444; border-radius: 999px; background: #1a1a1a; color: #eee; padding: 0 12px;
  }
  @supports (-webkit-touch-callout: none) {
    .margo-search--lb-panel { font-size: 16px; }
  }
  .margo-lb-focus__scroll {
    flex: 1 1 auto; min-height: 0; overflow-x: hidden; overflow-y: auto;
    overscroll-behavior: contain; touch-action: pan-y;
    padding-top: var(--lb-pin-gap); scroll-padding-top: var(--lb-pin-gap);
  }
  .row { height: 88px; border-bottom: 1px solid #333; padding: 8px; box-sizing: border-box; }
  .margo-post-card__lb-compose-body { display: flex; flex-direction: column; gap: 6px; padding: 0 0 8px; }
  .margo-post-card__lb-compose-track--chip {
    display: flex; align-items: center; gap: 8px; min-height: 36px; padding: 2px;
    border: 1px solid #444; border-radius: 10px;
  }
  .art { width: 32px; height: 32px; border-radius: 7px; background: #333; }
  .margo-post-card__lb-compose-lyric { position: relative; }
  .margo-post-card__lb-compose-input--panel {
    width: 100%; min-height: 64px; box-sizing: border-box; padding: 8px 40px 8px 10px;
    font-size: 14px; border-radius: 10px; border: 1px solid #444; background: #1a1a1a; color: #eee;
  }
  .send { position: absolute; right: 6px; bottom: 6px; width: 28px; height: 28px; }
</style>
</head>
<body>
<div class="pane" id="pane">
  <div class="margo-post-card__lb-panel" id="panel">
    <div class="margo-lb-focus">
      <div class="margo-lb-focus__chrome" id="chrome">
        <div class="margo-lb-focus__bar" id="bar" data-lb-pin="1">
          <div class="margo-lb-focus__search-wrap">
            <input id="search" class="margo-search--lb-panel" type="search" placeholder="Search" />
          </div>
          <button class="margo-lb-focus__chip" type="button">Ideas</button>
          <span class="margo-lb-focus__count">12</span>
          <button class="margo-post-card__lb-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="margo-post-card__lb-compose-body" id="composer">
          <div class="margo-post-card__lb-compose-track--chip">
            <span class="art"></span>
            <span>Song · Artist</span>
          </div>
          <div class="margo-post-card__lb-compose-lyric">
            <textarea class="margo-post-card__lb-compose-input--panel" rows="2">Write</textarea>
            <button class="send" type="button">S</button>
          </div>
        </div>
      </div>
      <div class="margo-lb-focus__scroll" id="list">
        <div class="row" data-lb-first-row="1" id="first">First reply</div>
        <div class="row">Two</div>
        <div class="row">Three</div>
        <div style="height:900px"></div>
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

async function metrics(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const bar = document.getElementById('bar')
    const first = document.getElementById('first')
    const search = document.getElementById('search')
    const composer = document.getElementById('composer')
    const list = document.getElementById('list')
    const pane = document.getElementById('pane')
    const panel = document.getElementById('panel')
    const br = bar?.getBoundingClientRect()
    const fr = first?.getBoundingClientRect()
    const sr = search?.getBoundingClientRect()
    const cr = composer?.getBoundingClientRect()
    const pr = panel?.getBoundingClientRect()
    return {
      barH: br ? Math.round(br.height) : 0,
      barBottom: br ? br.bottom : 0,
      firstTop: fr ? fr.top : 0,
      searchH: sr ? Math.round(sr.height) : 0,
      searchFs: search ? getComputedStyle(search).fontSize : '',
      composerH: cr ? Math.round(cr.height) : 0,
      listScroll: list ? { scrollLeft: list.scrollLeft, scrollTop: list.scrollTop } : null,
      paneScroll: pane ? { scrollLeft: pane.scrollLeft, scrollTop: pane.scrollTop } : null,
      docScroll: { scrollLeft: document.documentElement.scrollLeft, scrollTop: document.documentElement.scrollTop },
      panelLeft: pr ? Math.round(pr.left) : 0,
      panelW: pr ? Math.round(pr.width) : 0,
    }
  })
}

for (const width of [360, 390, 430]) {
  test.describe(`width ${width}`, () => {
    test('compact bar, first row clears pin, no horizontal shift', async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 844 })
      await page.setContent(FIXTURE, { waitUntil: 'domcontentloaded' })

      const before = await metrics(page)
      expect(before.barH).toBeLessThanOrEqual(52)
      expect(before.searchH).toBeGreaterThanOrEqual(34)
      expect(before.searchH).toBeLessThanOrEqual(36)
      expect(before.composerH).toBeLessThanOrEqual(130)
      expect(firstRowClearsPinnedBar(before.barBottom, before.firstTop)).toBeTruthy()
      expect(before.listScroll?.scrollTop ?? -1).toBe(0)

      await page.screenshot({
        path: testInfo.outputPath(`lb-density-${width}-top.png`),
        fullPage: false,
      })

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
      const after = await metrics(page)
      expect(after.paneScroll?.scrollLeft ?? 0).toBe(before.paneScroll?.scrollLeft ?? 0)
      expect(after.docScroll.scrollLeft).toBe(before.docScroll.scrollLeft)
      expect(after.panelLeft).toBe(before.panelLeft)
      expect(after.panelW).toBe(width)
      expect(firstRowClearsPinnedBar(after.barBottom, after.firstTop)).toBeTruthy()
    })
  })
}
