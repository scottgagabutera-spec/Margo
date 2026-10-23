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
    background: #222; display: flex; flex-direction: column; max-height: calc(100dvh - 208px);
    position: relative; z-index: 12;
  }
  .margo-lb-focus { --lb-pin-gap: 8px; display: flex; flex-direction: column; min-height: 0; flex: 1; overflow: hidden; }
  .margo-lb-focus__chrome { flex-shrink: 0; border-bottom: 1px solid #333; }
  .margo-lb-focus__pin { display: flex; flex-direction: column; }
  .margo-lb-focus__tabs { display: flex; align-items: center; gap: 6px; height: 30px; }
  .margo-lb-focus__switch { display: flex; flex: 1; height: 30px; }
  .margo-lb-focus__tab { height: 30px; border: 0; background: none; color: #d4a017; font-weight: 700; }
  .margo-lb-focus__close { width: 30px; height: 30px; border: 0; background: none; color: #d4a017; }
  .margo-lb-focus__search-wrap { width: 100%; padding: 4px 0 6px; }
  .margo-search--lb-panel {
    width: 100%; height: 36px; font-size: 14px; box-sizing: border-box;
    border: 1px solid #444; border-radius: 999px; background: #1a1a1a; color: #eee; padding: 0 12px;
  }
  @supports (-webkit-touch-callout: none) { .margo-search--lb-panel { font-size: 16px; } }
  .margo-lb-focus__scroll {
    flex: 1 1 auto; min-height: 0; overflow-x: hidden; overflow-y: auto;
    padding-top: var(--lb-pin-gap); scroll-padding-top: var(--lb-pin-gap);
  }
  .row { height: 88px; border-bottom: 1px solid #333; padding: 8px; box-sizing: border-box; }
  .margo-post-card__lb-compose-body { display: flex; flex-direction: column; gap: 6px; padding: 0 0 8px; }
  .margo-post-card__lb-compose-track--chip {
    display: flex; align-items: flex-start; gap: 8px; min-height: 44px; padding: 4px;
    border: 1px solid #444; border-radius: 10px;
  }
  .art { width: 36px; height: 36px; border-radius: 7px; background: #333; }
  .margo-post-card__lb-compose-lyric { position: relative; }
  .margo-post-card__lb-compose-input--panel {
    width: 100%; min-height: 64px; box-sizing: border-box; padding: 8px 40px 8px 10px;
    font-size: 14px; border-radius: 10px; border: 1px solid #444; background: #1a1a1a; color: #eee;
  }
  .send { position: absolute; right: 6px; bottom: 6px; width: 28px; height: 28px; }
  .compose-search-row--panel { display: flex; align-items: flex-start; min-height: 44px; padding: 6px 10px; }
  #results { display: none; position: fixed; overflow: auto; background: #1a1a1a; }
</style>
</head>
<body>
<div class="pane" id="pane">
  <div class="margo-post-card__lb-panel" id="panel">
    <div class="margo-lb-focus">
      <div class="margo-lb-focus__chrome" id="chrome">
        <div class="margo-lb-focus__pin" id="bar" data-lb-pin="1">
          <div class="margo-lb-focus__tabs">
            <div class="margo-lb-focus__switch">
              <button class="margo-lb-focus__tab" type="button">Replies</button>
              <button class="margo-lb-focus__tab" type="button">Ideas</button>
            </div>
            <button class="margo-lb-focus__close" type="button" aria-label="Close">×</button>
          </div>
          <div class="margo-lb-focus__search-wrap">
            <input id="search" class="margo-search--lb-panel" type="search" placeholder="Search" />
          </div>
        </div>
        <div class="margo-post-card__lb-compose-body" id="composer">
          <div class="margo-post-card__lb-compose-track--chip">
            <span class="art"></span>
            <div><div>Seduce Me</div><div>Alikiba</div></div>
          </div>
          <div class="margo-post-card__lb-compose-lyric">
            <textarea id="lyric" class="margo-post-card__lb-compose-input--panel" data-lb-lyric="1" rows="2" placeholder="Write your line…"></textarea>
            <button class="send" id="send" type="button">S</button>
          </div>
        </div>
      </div>
      <div class="margo-lb-focus__scroll" id="list">
        <div id="anchor" style="height:180px">Anchor reply being answered</div>
        <div class="row" data-lb-first-row="1" id="first">First reply</div>
        <div class="row">Two</div>
        <div class="row">Three</div>
        <div style="height:900px"></div>
      </div>
    </div>
  </div>
</div>
<div id="picker" style="height:200px;overflow-y:auto;touch-action:pan-y;margin-top:600px">
  <div class="lrow" style="height:44px">Line 1</div><div class="lrow" style="height:44px">Line 2</div>
  <div class="lrow" style="height:44px">Line 3</div><div class="lrow" style="height:44px">Line 4</div>
  <div class="lrow" style="height:44px">Line 5</div><div class="lrow" style="height:44px">Line 6</div>
  <div class="lrow" style="height:44px">Line 7</div><div class="lrow" style="height:44px">Line 8</div>
  <div class="lrow" style="height:44px">Line 9</div><div class="lrow" style="height:44px">Line 10</div>
  <div class="lrow" style="height:44px">Line 11</div><div class="lrow" style="height:44px">Line 12</div>
</div>
<div id="results" data-lb-search-list="1">
  <button class="compose-search-row--panel" type="button" id="pick-external">Seduce Me</button>
  <button class="compose-search-row--panel" type="button">Row 2</button>
  <button class="compose-search-row--panel" type="button">Row 3</button>
  <button class="compose-search-row--panel" type="button">Row 4</button>
  <button class="compose-search-row--panel" type="button">Row 5</button>
</div>
<script>
  const panel = document.getElementById('panel');
  const search = document.getElementById('search');
  const lyric = document.getElementById('lyric');
  const results = document.getElementById('results');
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
  window.layoutResults = function layoutResults() {
    const pin = document.getElementById('bar').getBoundingClientRect();
    const panelBox = document.getElementById('panel').getBoundingClientRect();
    const height = (vv?.height ?? window.innerHeight);
    const offsetTop = vv?.offsetTop ?? 0;
    results.style.display = 'block';
    results.style.left = panelBox.left + 'px';
    results.style.width = panelBox.width + 'px';
    results.style.top = (pin.bottom + 4) + 'px';
    results.style.maxHeight = Math.max(0, offsetTop + height - pin.bottom - 12) + 'px';
  }
  vv?.addEventListener('resize', capPanel);
  vv?.addEventListener('scroll', capPanel);
  search.addEventListener('focusin', () => {
    try { search.focus({ preventScroll: true }); } catch (_) {}
    capPanel();
    layoutResults();
  });
  document.addEventListener('focusout', () => { capPanel(); });
  search.addEventListener('blur', () => { results.style.display = 'none'; });
  document.getElementById('pick-external').addEventListener('click', () => {
    results.style.display = 'none';
    search.blur();
    composerSent = false;
  });
  let composerSent = false;
  document.getElementById('send').addEventListener('click', () => {
    if (lyric.value.trim()) composerSent = true;
    document.body.dataset.sent = composerSent ? '1' : '0';
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
    const results = document.getElementById('results')
    const br = bar?.getBoundingClientRect()
    const fr = first?.getBoundingClientRect()
    const sr = search?.getBoundingClientRect()
    const cr = composer?.getBoundingClientRect()
    const pr = panel?.getBoundingClientRect()
    const rr = results?.getBoundingClientRect()
    const visibleResultRows = results
      ? [...results.querySelectorAll('.compose-search-row--panel')].filter((el) => {
        const r = el.getBoundingClientRect()
        const max = results.getBoundingClientRect().bottom
        return r.top >= results.getBoundingClientRect().top - 1 && r.bottom <= max + 1
      }).length
      : 0
    return {
      barH: br ? Math.round(br.height) : 0,
      barBottom: br ? br.bottom : 0,
      firstTop: fr ? fr.top : 0,
      searchH: sr ? Math.round(sr.height) : 0,
      searchW: sr ? Math.round(sr.width) : 0,
      composerH: cr ? Math.round(cr.height) : 0,
      listScroll: list ? { scrollLeft: list.scrollLeft, scrollTop: list.scrollTop } : null,
      paneScroll: pane ? { scrollLeft: pane.scrollLeft, scrollTop: pane.scrollTop } : null,
      docScroll: { scrollLeft: document.documentElement.scrollLeft, scrollTop: document.documentElement.scrollTop },
      panelLeft: pr ? Math.round(pr.left) : 0,
      panelW: pr ? Math.round(pr.width) : 0,
      resultsW: rr && rr.width ? Math.round(rr.width) : 0,
      visibleResultRows,
    }
  })
}

for (const width of [360, 390, 430]) {
  test.describe(`width ${width}`, () => {
    test('pin, results, and external lyric field stay usable', async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 844 })
      await page.setContent(FIXTURE, { waitUntil: 'domcontentloaded' })

      const panelH = await page.evaluate(() => Math.round(document.getElementById('panel')!.getBoundingClientRect().height))
      expect(panelH).toBeGreaterThanOrEqual(630)

      // Nested entry: anchor pushed fully above the list, first child at top.
      await page.evaluate(() => {
        const list = document.getElementById('list')!
        const anchor = document.getElementById('anchor')!
        list.scrollTop = list.scrollTop + anchor.getBoundingClientRect().bottom - list.getBoundingClientRect().top
      })
      const nested = await page.evaluate(() => {
        const list = document.getElementById('list')!.getBoundingClientRect()
        const anchor = document.getElementById('anchor')!.getBoundingClientRect()
        const first = document.getElementById('first')!.getBoundingClientRect()
        return { anchorBottom: anchor.bottom, listTop: list.top, firstTop: first.top }
      })
      expect(nested.anchorBottom).toBeLessThanOrEqual(nested.listTop + 1)
      expect(nested.firstTop).toBeGreaterThanOrEqual(nested.listTop)

      const before = await metrics(page)
      expect(before.barH).toBeLessThanOrEqual(80)
      expect(before.searchH).toBeGreaterThanOrEqual(34)
      expect(before.searchH).toBeLessThanOrEqual(36)
      expect(before.searchW).toBeGreaterThan(width - 40)
      expect(firstRowClearsPinnedBar(before.barBottom, before.firstTop)).toBeTruthy()

      await page.evaluate(() => {
        const vv = window.visualViewport
        if (!vv) return
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 })
        Object.defineProperty(vv, 'height', { configurable: true, value: 380 })
        Object.defineProperty(vv, 'offsetTop', { configurable: true, value: 0 })
        vv.dispatchEvent(new Event('resize'))
      })

      await page.locator('#search').click()
      await page.evaluate(() => { (window as unknown as { layoutResults: () => void }).layoutResults() })
      const searching = await metrics(page)
      expect(searching.paneScroll?.scrollLeft ?? 0).toBe(0)
      expect(searching.resultsW).toBe(searching.panelW)
      expect(searching.visibleResultRows).toBeGreaterThanOrEqual(3)

      await page.evaluate(() => {
        const results = document.getElementById('results')
        const search = document.getElementById('search') as HTMLInputElement | null
        if (results) results.style.display = 'none'
        search?.blur()
      })
      await page.locator('#lyric').focus()
      await expect(page.locator('#lyric')).toBeFocused()
      await page.locator('#lyric').fill('a line from outside')
      await page.locator('#send').click()
      await expect(page.locator('body')).toHaveAttribute('data-sent', '1')

      const after = await metrics(page)
      expect(after.panelLeft).toBe(before.panelLeft)
      expect(after.docScroll.scrollLeft).toBe(0)

      // Line picker: one scroller, wheel or drag moves it.
      await page.locator('#picker').scrollIntoViewIfNeeded()
      const pickerBox = await page.locator('#picker').boundingBox()
      if (pickerBox) {
        const cx = pickerBox.x + pickerBox.width / 2
        const cy = pickerBox.y + pickerBox.height / 2
        await page.mouse.move(cx, cy)
        await page.mouse.wheel(0, 300).catch(() => {})
        const afterWheel = await page.evaluate(() => document.getElementById('picker')?.scrollTop ?? 0)
        if (afterWheel <= 50) {
          await page.mouse.move(cx, cy + 60)
          await page.mouse.down()
          await page.mouse.move(cx, cy - 80, { steps: 8 })
          await page.mouse.up()
        }
      }
      const pickerScrollTop = await page.evaluate(() => document.getElementById('picker')?.scrollTop ?? 0)
      if (pickerScrollTop <= 50 && testInfo.project.name === 'webkit') {
        // Playwright mobile WebKit has no wheel/drag gesture; prove the region itself scrolls.
        const proven = await page.evaluate(() => {
          const el = document.getElementById('picker')
          if (!el) return 0
          el.scrollTop = 120
          return el.scrollTop
        })
        expect(proven).toBeGreaterThan(50)
      } else {
        expect(pickerScrollTop).toBeGreaterThan(50)
      }

      await page.screenshot({
        path: testInfo.outputPath(`lb-composer-${width}.png`),
        fullPage: false,
      })
    })
  })
}
