import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACT_SHOTS = '/opt/cursor/artifacts/screenshots'

function saveArtifactShot(page: Page, filename: string) {
  if (!fs.existsSync(ARTIFACT_SHOTS)) return
  return page.screenshot({ path: path.join(ARTIFACT_SHOTS, filename), fullPage: false })
}

const REPORT_MENU_CSS_MARKERS = [
  'margo-post-report-menu',
  'margo-lb-thread-row__more',
  'margo-sheet-root',
  'margo-sheet__',
] as const

/** Keep full rule blocks from globals.css (line filters drop min-height/padding). */
function extractReportMenuCss(source: string): string {
  const lines = source.split('\n')
  const out: string[] = []
  let capturing = false
  let depth = 0
  for (const line of lines) {
    const hitsMarker = REPORT_MENU_CSS_MARKERS.some((m) => line.includes(m))
    if (!capturing && hitsMarker) {
      capturing = true
      depth = 0
    }
    if (!capturing) continue
    out.push(line)
    for (const ch of line) {
      if (ch === '{') depth += 1
      if (ch === '}') depth -= 1
    }
    if (capturing && depth <= 0 && line.includes('}')) {
      capturing = false
    }
  }
  return out.join('\n')
}

const REPORT_CSS = extractReportMenuCss(
  fs.readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8'),
)

const FIXTURE = (extraCss = '') => String.raw`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<style>
  :root { --surface-2: #1c1c1f; --border: #3a3a42; --text: #eee; --text-secondary: #aaa; --bg: #111; --gold: #d4a017; --post-vibe-text: #d4a017; --margo-tabbar-h: 64px; }
  html, body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; overflow-x: hidden; }
  .margo-post-card__lb-panel {
    box-sizing: border-box; width: 100%; max-height: calc(100dvh - 120px);
    overflow: hidden; display: flex; flex-direction: column; background: #222;
  }
  .margo-lb-focus__pin {
    flex-shrink: 0; padding: 8px 12px 6px; border-bottom: 1px solid #333;
    position: relative; z-index: 5;
  }
  .margo-search--lb-panel {
    width: 100%; height: 36px; font-size: 14px; box-sizing: border-box;
    border: 1px solid #444; border-radius: 999px; background: #1a1a1a; color: #eee; padding: 0 12px;
  }
  .margo-lb-focus__scroll {
    flex: 1; min-height: 0; overflow: hidden auto; padding: 8px 0;
  }
  .margo-lb-thread-row { border-bottom: 1px solid #333; padding: 0 0 8px; }
  .margo-lb-thread-row__header { display: flex; align-items: flex-start; gap: 8px; padding: 8px 12px 4px; }
  .margo-lb-thread-row__lyric { margin: 0 12px; padding: 8px 10px; min-height: 44px; background: #1a1a1a; border-radius: 8px; font-size: 14px; }
  .margo-post-card { margin: 16px 12px; padding: 12px; border: 1px solid #333; border-radius: 12px; background: #1a1a1a; }
  .margo-post-card__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  .margo-post-card__icon-btn { width: 44px; height: 44px; border: 0; background: transparent; color: #eee; border-radius: 50%; }
  #portal-menu { z-index: 230; }
  #portal-sheet { z-index: 240; }
  ${extraCss}
  ${REPORT_CSS}
</style></head><body>
<div class="margo-post-card__lb-panel" id="panel">
  <div class="margo-lb-focus__pin" id="pin">
    <input class="margo-search--lb-panel" id="search" type="search" placeholder="Search Lyric Backs" aria-label="Search" />
  </div>
  <div class="margo-lb-focus__scroll" id="list">
    <article class="margo-lb-thread-row" data-row="first">
      <header class="margo-lb-thread-row__header">
        <div style="flex:1">First author</div>
        <button type="button" class="margo-post-report-menu__trigger margo-post-card__icon-btn margo-lb-thread-row__more" data-more="first" aria-label="More actions">⋯</button>
      </header>
      <p class="margo-lb-thread-row__lyric" id="lyric-first">First row lyric line text</p>
    </article>
    <article class="margo-lb-thread-row" data-row="middle">
      <header class="margo-lb-thread-row__header">
        <div style="flex:1">Middle author</div>
        <button type="button" class="margo-post-report-menu__trigger margo-post-card__icon-btn margo-lb-thread-row__more" data-more="middle" aria-label="More actions">⋯</button>
      </header>
      <p class="margo-lb-thread-row__lyric" id="lyric-middle">Middle row lyric line</p>
    </article>
    <div style="height:520px" aria-hidden="true"></div>
    <article class="margo-lb-thread-row" data-row="last">
      <header class="margo-lb-thread-row__header">
        <div style="flex:1">Last author</div>
        <button type="button" class="margo-post-report-menu__trigger margo-post-card__icon-btn margo-lb-thread-row__more" data-more="last" aria-label="More actions">⋯</button>
      </header>
      <p class="margo-lb-thread-row__lyric" id="lyric-last">Last row lyric line</p>
    </article>
    <div style="height:80px" aria-hidden="true"></div>
  </div>
</div>
<article class="margo-post-card" id="feed-card">
  <header class="margo-post-card__header">
    <div><strong>Feed author</strong><div style="font-size:12px;color:#aaa">Sample post</div></div>
    <button type="button" class="margo-post-report-menu__trigger margo-post-card__icon-btn" data-more="feed" aria-label="More actions">⋯</button>
  </header>
  <p style="margin:8px 0 0;font-size:15px">Feed post lyric snippet for report menu test.</p>
</article>
<script>
  const MENU_W = 168;
  const MENU_ROW_H = 36;
  const MENU_PAD = 4;
  const REASONS = ['Spam', 'Harassment', 'Inappropriate', 'Other'];

  function computeReportPopoverPosition(input) {
    const edgePad = input.edgePad ?? 8;
    const gap = input.gap ?? 6;
    const spaceBelow = input.viewportBottom - input.triggerRect.bottom - edgePad;
    const spaceAbove = input.triggerRect.top - input.viewportTop - edgePad;
    const openUp = spaceBelow < input.menuHeight + gap && spaceAbove >= input.menuHeight + gap;
    const top = openUp
      ? input.triggerRect.top - gap - input.menuHeight
      : input.triggerRect.bottom + gap;
    const leftRaw = input.triggerRect.right - input.menuWidth;
    const left = Math.min(
      Math.max(edgePad, leftRaw),
      Math.max(edgePad, input.viewportWidth - input.menuWidth - edgePad),
    );
    return { top, left, openUp };
  }

  let menuEl = null;
  let sheetEl = null;
  let activeTrigger = null;

  function closeMenu() {
    if (menuEl) menuEl.remove();
    menuEl = null;
    activeTrigger?.setAttribute('aria-expanded', 'false');
    activeTrigger = null;
  }

  function closeSheet() {
    if (sheetEl) sheetEl.remove();
    sheetEl = null;
    document.documentElement.removeAttribute('data-margo-sheet-open');
  }

  function openMenu(btn) {
    closeMenu();
    closeSheet();
    activeTrigger = btn;
    btn.setAttribute('aria-expanded', 'true');
    menuEl = document.createElement('div');
    menuEl.id = 'portal-menu';
    menuEl.className = 'margo-post-report-menu__popover';
    menuEl.setAttribute('role', 'menu');
    menuEl.style.position = 'fixed';
    menuEl.style.width = MENU_W + 'px';
    menuEl.style.visibility = 'hidden';
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'margo-post-report-menu__row';
    row.setAttribute('role', 'menuitem');
    row.textContent = 'Report';
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMenu();
      openSheet();
    });
    menuEl.appendChild(row);
    document.body.appendChild(menuEl);
    layoutMenu(btn);
  }

  function layoutMenu(btn) {
    if (!menuEl) return;
    const menuHeight = menuEl.offsetHeight || MENU_PAD * 2 + MENU_ROW_H;
    const r = btn.getBoundingClientRect();
    const vv = window.visualViewport;
    const viewportTop = vv?.offsetTop ?? 0;
    const viewportBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
    const viewportWidth = vv?.width ?? window.innerWidth;
    const next = computeReportPopoverPosition({
      triggerRect: r,
      menuWidth: MENU_W,
      menuHeight,
      viewportTop,
      viewportBottom,
      viewportWidth,
    });
    menuEl.style.top = next.top + 'px';
    menuEl.style.left = next.left + 'px';
    menuEl.style.visibility = 'visible';
    menuEl.dataset.openUp = next.openUp ? '1' : '0';
  }

  function openSheet() {
    closeSheet();
    document.documentElement.setAttribute('data-margo-sheet-open', '1');
    sheetEl = document.createElement('div');
    sheetEl.id = 'portal-sheet';
    sheetEl.style.position = 'fixed';
    sheetEl.style.inset = '0';
    sheetEl.style.background = 'rgba(7,6,10,0.92)';
    sheetEl.style.display = 'flex';
    sheetEl.style.alignItems = 'flex-end';
    sheetEl.style.padding = 'max(16px, env(safe-area-inset-top, 0px)) 12px calc(12px + var(--margo-tabbar-h, 64px) + 16px)';
    const panel = document.createElement('div');
    panel.style.width = '100%';
    panel.style.borderRadius = '14px';
    panel.style.background = 'var(--surface-2)';
    panel.style.border = '1px solid var(--border)';
    panel.style.padding = '8px 0';
    const title = document.createElement('div');
    title.textContent = 'Report';
    title.style.padding = '8px 16px';
    title.style.fontWeight = '700';
    panel.appendChild(title);
    const body = document.createElement('div');
    body.className = 'margo-post-report-menu__sheet';
    const options = document.createElement('div');
    options.className = 'margo-post-report-menu__sheet-options';
    options.setAttribute('role', 'radiogroup');
    let selected = null;
    for (const reason of REASONS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'margo-post-report-menu__sheet-row';
      b.setAttribute('role', 'radio');
      b.innerHTML = '<span>' + reason + '</span>';
      b.addEventListener('click', () => {
        selected = reason;
        options.querySelectorAll('.margo-post-report-menu__sheet-row').forEach((el) => {
          el.classList.toggle('margo-post-report-menu__sheet-row--selected', el === b);
        });
        submit.disabled = false;
        submit.removeAttribute('disabled');
        noteWrap.style.display = reason === 'Other' ? 'flex' : 'none';
      });
      options.appendChild(b);
    }
    body.appendChild(options);
    const noteWrap = document.createElement('label');
    noteWrap.className = 'margo-post-report-menu__sheet-note-wrap';
    noteWrap.style.display = 'none';
    const note = document.createElement('textarea');
    note.className = 'margo-post-report-menu__sheet-note';
    noteWrap.appendChild(note);
    body.appendChild(noteWrap);
    const actions = document.createElement('div');
    actions.className = 'margo-post-report-menu__sheet-actions';
    const submit = document.createElement('button');
    submit.type = 'button';
    submit.className = 'margo-post-report-menu__sheet-submit';
    submit.textContent = 'Report';
    submit.disabled = true;
    submit.setAttribute('disabled', 'disabled');
    actions.appendChild(submit);
    body.appendChild(actions);
    panel.appendChild(body);
    sheetEl.appendChild(panel);
    sheetEl.addEventListener('click', (e) => { if (e.target === sheetEl) closeSheet(); });
    document.body.appendChild(sheetEl);
  }

  document.querySelectorAll('[data-more]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (menuEl && activeTrigger === btn) closeMenu();
      else openMenu(btn);
    });
  });

  window.addEventListener('scroll', () => closeMenu(), true);
  window.visualViewport?.addEventListener('resize', () => { if (menuEl && activeTrigger) layoutMenu(activeTrigger); });
</script>
</body></html>`

type RowKey = 'first' | 'middle' | 'last' | 'feed'

async function scrollRowIntoView(page: Page, row: RowKey) {
  if (row === 'feed') {
    await page.locator('#feed-card').scrollIntoViewIfNeeded()
    return
  }
  await page.locator(`[data-row="${row}"]`).scrollIntoViewIfNeeded()
  if (row === 'first') {
    await page.evaluate(() => {
      const list = document.getElementById('list')!
      list.scrollTop = 0
    })
  }
}

async function assertMenuVisible(page: Page, edge = 8) {
  const layout = await page.evaluate(({ edge: pad }) => {
    const menu = document.getElementById('portal-menu')
    const pin = document.getElementById('pin')!
    const search = document.getElementById('search')!
    if (!menu) return { ok: false, reason: 'no-menu' }
    const m = menu.getBoundingClientRect()
    const vv = window.visualViewport
    const vTop = vv?.offsetTop ?? 0
    const vBottom = vv ? vv.offsetTop + vv.height : window.innerHeight
    const vWidth = vv?.width ?? window.innerWidth
    const inside =
      m.top >= vTop + pad - 1
      && m.left >= pad - 1
      && m.right <= vWidth - pad + 1
      && m.bottom <= vBottom - pad + 1
    const pinRect = pin.getBoundingClientRect()
    const searchRect = search.getBoundingClientRect()
    const overlapsPin = !(m.bottom <= pinRect.top + 2 || m.top >= pinRect.bottom - 2)
      && !(m.right <= pinRect.left || m.left >= pinRect.right)
    const portaledOnBody = menu.parentElement === document.body
    return {
      ok: inside && !overlapsPin && portaledOnBody,
      inside,
      overlapsPin,
      portaledOnBody,
      menuH: Math.round(m.height),
      menuW: Math.round(m.width),
      searchBottom: searchRect.bottom,
      menuTop: m.top,
    }
  }, { edge })
  expect(layout.ok, JSON.stringify(layout)).toBe(true)
  expect(layout.menuW).toBeGreaterThanOrEqual(140)
  expect(layout.menuW).toBeLessThanOrEqual(180)
  expect(layout.menuH).toBeLessThanOrEqual(52)
  expect(layout.portaledOnBody).toBe(true)
}

async function assertSheetVisible(page: Page) {
  await expect(page.locator('#portal-sheet')).toBeVisible()
  for (const reason of ['Spam', 'Harassment', 'Inappropriate', 'Other']) {
    await expect(page.getByRole('radio', { name: reason })).toBeVisible()
  }
  const submit = page.locator('#portal-sheet .margo-post-report-menu__sheet-submit')
  await expect(submit).toBeDisabled()
  await page.getByRole('radio', { name: 'Spam' }).click()
  await expect(submit).toBeEnabled()
  const layout = await page.evaluate(() => {
    const sheet = document.getElementById('portal-sheet')
    const panel = sheet?.querySelector('div')
    if (!sheet || !panel) return { ok: false, reason: 'missing' }
    const vv = window.visualViewport
    const vTop = vv?.offsetTop ?? 0
    const vBottom = vv ? vv.offsetTop + vv.height : window.innerHeight
    const rows = [...panel.querySelectorAll('.margo-post-report-menu__sheet-row')]
    const rowRects = rows.map((el) => el.getBoundingClientRect())
    const rowsInView = rowRects.length === 4 && rowRects.every(
      (r) => r.top >= vTop && r.top < vBottom - 24 && r.height >= 36,
    )
    return {
      ok: sheet.parentElement === document.body && rows.length === 4 && rowsInView,
      rowCount: rows.length,
      rowsInView,
    }
  })
  expect(layout.ok, JSON.stringify(layout)).toBe(true)
  expect(layout.rowCount).toBe(4)
}

for (const width of [360, 390, 430]) {
  for (const row of ['first', 'middle', 'last'] as const) {
    test(`LB ${row} row: portaled menu and sheet visible (${width}px)`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 844 })
      await page.setContent(FIXTURE(), { waitUntil: 'domcontentloaded' })
      await scrollRowIntoView(page, row)
      await page.locator(`[data-more="${row}"]`).click()
      await assertMenuVisible(page)
      if (width === 390) {
        const shot =
          row === 'first'
            ? 'report-menu-after-lb-first-390-popover.png'
            : row === 'middle'
              ? 'report-menu-after-lb-second-390-popover.png'
              : null
        if (shot) await saveArtifactShot(page, shot)
      }
      await page.getByRole('menuitem', { name: 'Report' }).click()
      await assertSheetVisible(page)
      if (row === 'first' && width === 390) {
        await saveArtifactShot(page, 'report-menu-after-lb-first-390-sheet.png')
      }
      if (row === 'middle' && width === 390) {
        await saveArtifactShot(page, 'report-menu-after-lb-second-390-sheet.png')
      }
    })
  }

  test(`feed PostCard: portaled menu and sheet visible (${width}px)`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(FIXTURE(), { waitUntil: 'domcontentloaded' })
    await scrollRowIntoView(page, 'feed')
    await page.locator('[data-more="feed"]').click()
    await assertMenuVisible(page)
    if (width === 390) await saveArtifactShot(page, 'report-menu-after-feed-390-popover.png')
    await page.getByRole('menuitem', { name: 'Report' }).click()
    await assertSheetVisible(page)
    if (width === 390) await saveArtifactShot(page, 'report-menu-after-feed-390-sheet.png')
  })
}
