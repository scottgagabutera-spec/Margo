import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const CSS_MARKERS = ['margo-post-report-menu', 'margo-lb-owner-sheet'] as const

function extractCss(source: string): string {
  const lines = source.split('\n')
  const out: string[] = []
  let capturing = false
  let depth = 0
  for (const line of lines) {
    const hit = CSS_MARKERS.some((m) => line.includes(m))
    if (!capturing && hit) {
      capturing = true
      depth = 0
    }
    if (!capturing) continue
    out.push(line)
    for (const ch of line) {
      if (ch === '{') depth += 1
      if (ch === '}') depth -= 1
    }
    if (capturing && depth <= 0 && line.includes('}')) capturing = false
  }
  return out.join('\n')
}

const LB_CSS = extractCss(fs.readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8'))

/** PR A: Delete always enabled; shells via API, not blocked menu. */
const FIXTURE = (opts: { echoCount: number }) => String.raw`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<style>
  :root { --surface-2: #1c1c1f; --border: #3a3a42; --text: #eee; --text-secondary: #aaa; --bg: #111; --gold: #d4a017; }
  body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; padding: 16px; }
  ${LB_CSS}
</style></head><body>
<button type="button" class="margo-post-report-menu__trigger" id="more" aria-label="More actions">⋯</button>
<script>
  const echoCount = ${opts.echoCount};
  const MENU_W = 168;
  let menuEl = null;
  let sheetEl = null;
  function openMenu() {
    if (menuEl) menuEl.remove();
    menuEl = document.createElement('div');
    menuEl.id = 'portal-menu';
    menuEl.className = 'margo-post-report-menu__popover';
    menuEl.style.position = 'fixed';
    menuEl.style.top = '120px';
    menuEl.style.left = '24px';
    menuEl.style.width = MENU_W + 'px';
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'margo-post-report-menu__row';
    del.setAttribute('role', 'menuitem');
    del.textContent = 'Delete';
    del.addEventListener('click', () => {
      document.body.dataset.action = 'delete';
      closeMenu();
      openDeleteSheet();
    });
    menuEl.appendChild(del);
    document.body.appendChild(menuEl);
  }
  function closeMenu() { if (menuEl) menuEl.remove(); menuEl = null; }
  function openDeleteSheet() {
    if (sheetEl) sheetEl.remove();
    sheetEl = document.createElement('div');
    sheetEl.id = 'delete-sheet';
    sheetEl.innerHTML = '<p id="dlg-title" style="font-style:italic">Delete this Lyric Back?</p><button type="button" id="confirm-del">Delete</button>';
    document.body.appendChild(sheetEl);
    document.getElementById('confirm-del').addEventListener('click', () => {
      fetch('/api/posts/lyric-back', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: 'lb-test', echoCount }),
      }).then(r => { document.body.dataset.deleteStatus = String(r.status); document.body.dataset.deleteOutcome = echoCount > 0 ? 'shelled' : 'deleted'; });
    });
  }
  document.getElementById('more').addEventListener('click', openMenu);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('/api/posts/lyric-back') && init?.method === 'DELETE') {
      const body = JSON.parse(init.body || '{}');
      const count = typeof body.echoCount === 'number' ? body.echoCount : echoCount;
      const outcome = count > 0 ? 'shelled' : 'deleted';
      return new Response(JSON.stringify({ success: true, outcome }), { status: 200 });
    }
    return new Response('{}', { status: 404 });
  };
</script>
</body></html>`

for (const width of [360, 390, 430]) {
  test(`owner delete stays enabled when children (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(FIXTURE({ echoCount: 2 }), { waitUntil: 'domcontentloaded' })
    await page.locator('#more').click()
    const del = page.getByRole('menuitem', { name: 'Delete' })
    await expect(del).toBeEnabled()
    await expect(page.locator('.margo-post-report-menu__row-hint')).toHaveCount(0)
    await del.click()
    await expect(page.locator('#dlg-title')).toHaveText('Delete this Lyric Back?')
    await page.locator('#confirm-del').click()
    await expect.poll(async () => page.evaluate(() => document.body.dataset.deleteStatus)).toBe('200')
    await expect.poll(async () => page.evaluate(() => document.body.dataset.deleteOutcome)).toBe('shelled')
  })

  test(`owner delete sheet calls lyric-back DELETE (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(FIXTURE({ echoCount: 0 }), { waitUntil: 'domcontentloaded' })
    await page.locator('#more').click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page.locator('#confirm-del').click()
    await expect.poll(async () => page.evaluate(() => document.body.dataset.deleteOutcome)).toBe('deleted')
  })
}
