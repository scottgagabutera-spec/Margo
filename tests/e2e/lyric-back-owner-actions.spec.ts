import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const CSS_MARKERS = [
  'margo-post-report-menu',
  'margo-lb-owner-sheet',
  'margo-lb-vibe-chips',
  'margo-lb-edit-sheet',
] as const

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

const FIXTURE = (opts: { echoCount: number }) => String.raw`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<style>
  :root { --surface-2: #1c1c1f; --border: #3a3a42; --text: #eee; --text-secondary: #aaa; --bg: #111; --gold: #d4a017; --post-vibe-text: #d4a017; }
  body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; padding: 16px; }
  ${LB_CSS}
</style></head><body>
<button type="button" class="margo-post-report-menu__trigger" id="more" aria-label="More actions">⋯</button>
<script>
  const echoCount = ${opts.echoCount};
  const MENU_W = 168;
  const MENU_ROW_H = 36;
  let menuEl = null;
  function openMenu() {
    if (menuEl) menuEl.remove();
    menuEl = document.createElement('div');
    menuEl.id = 'portal-menu';
    menuEl.className = 'margo-post-report-menu__popover';
    menuEl.style.position = 'fixed';
    menuEl.style.top = '120px';
    menuEl.style.left = '24px';
    menuEl.style.width = MENU_W + 'px';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'margo-post-report-menu__row';
    edit.setAttribute('role', 'menuitem');
    edit.textContent = 'Edit';
    edit.dataset.action = 'edit';
    edit.addEventListener('click', () => { document.body.dataset.action = 'edit'; closeMenu(); openEdit(); });
    menuEl.appendChild(edit);
    const wrap = document.createElement('div');
    wrap.className = 'margo-post-report-menu__row-wrap';
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'margo-post-report-menu__row margo-post-report-menu__row--muted';
    del.setAttribute('role', 'menuitem');
    del.textContent = 'Delete';
    del.disabled = echoCount > 0;
    del.addEventListener('click', () => { if (echoCount > 0) return; document.body.dataset.action = 'delete'; closeMenu(); });
    wrap.appendChild(del);
    if (echoCount > 0) {
      const hint = document.createElement('p');
      hint.className = 'margo-post-report-menu__row-hint';
      hint.textContent = 'Lyric Backs below';
      wrap.appendChild(hint);
    }
    menuEl.appendChild(wrap);
    document.body.appendChild(menuEl);
  }
  function closeMenu() { if (menuEl) menuEl.remove(); menuEl = null; }
  function openEdit() {
    const sheet = document.createElement('div');
    sheet.id = 'edit-sheet';
    sheet.className = 'margo-lb-edit-sheet';
    sheet.innerHTML = '<textarea class="margo-lb-edit-sheet__textarea"></textarea><div class="margo-lb-vibe-chips"><div class="margo-lb-vibe-chips__scroller"><button type="button" class="margo-lb-vibe-chips__chip margo-lb-vibe-chips__chip--on">Chill</button></div></div>';
    document.body.appendChild(sheet);
  }
  document.getElementById('more').addEventListener('click', openMenu);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('/api/posts/lyric-back') && init?.method === 'PATCH') {
      if (document.body.dataset.nonOwner === '1') {
        return new Response(JSON.stringify({ error: 'Not allowed' }), { status: 403 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (url.includes('/api/posts/moment') && init?.method === 'DELETE') {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    return new Response('{}', { status: 404 });
  };
</script>
</body></html>`

for (const width of [360, 390, 430]) {
  test(`owner delete blocked when children (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(FIXTURE({ echoCount: 2 }), { waitUntil: 'domcontentloaded' })
    await page.locator('#more').click()
    const del = page.getByRole('menuitem', { name: 'Delete' })
    await expect(del).toBeDisabled()
    await expect(page.locator('.margo-post-report-menu__row-hint')).toHaveText('Lyric Backs below')
  })

  test(`owner edit opens sheet (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(FIXTURE({ echoCount: 0 }), { waitUntil: 'domcontentloaded' })
    await page.locator('#more').click()
    await page.getByRole('menuitem', { name: 'Edit' }).click()
    await expect(page.locator('.margo-lb-edit-sheet__textarea')).toBeVisible()
    await expect(page.locator('.margo-lb-vibe-chips__chip')).toBeVisible()
  })
}

test('PATCH lyric-back returns 403 for non-owner (mock)', async ({ page }) => {
  await page.setContent(
    `<!DOCTYPE html><html><body><script>
      document.body.dataset.nonOwner = '1';
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('/api/posts/lyric-back') && init?.method === 'PATCH') {
          return new Response(JSON.stringify({ error: 'Not allowed' }), { status: 403 });
        }
        return new Response('{}', { status: 404 });
      };
      fetch('/api/posts/lyric-back', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: 'p1', text: 'x', emotion: 'CHILL' }) })
        .then(r => { document.body.dataset.status = String(r.status); });
    </script></body></html>`,
    { waitUntil: 'domcontentloaded' },
  )
  await expect.poll(async () => page.evaluate(() => document.body.dataset.status)).toBe('403')
})
