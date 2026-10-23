import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const CSS_MARKERS = ['margo-lb-thread-row', 'margo-lb-owner-sheet', 'margo-feed-action__badge'] as const

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

/** Simulates optimistic UI after DELETE success (no navigation). */
const FIXTURE = (opts: { childEchoCount: number }) => String.raw`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  :root { --surface-2: #1c1c1f; --border: #3a3a42; --text: #eee; --text-muted: #888; --bg: #111; --feed-type-action-count: 0.55rem; }
  body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; padding: 16px; }
  ${LB_CSS}
</style></head><body>
<p id="header-count" data-count="2">Lyric Backs 2</p>
<ul id="list">
  <li><article class="margo-lb-thread-row" id="row-a" data-echo-id="a">
    <p class="margo-lb-thread-row__lyric" id="lyric-a">First LB</p>
    <button type="button" id="del-a" class="margo-lb-owner-sheet__btn margo-lb-owner-sheet__btn--danger">Delete</button>
  </article></li>
</ul>
<div id="sheet" hidden class="margo-lb-owner-sheet">
  <button type="button" id="confirm" class="margo-lb-owner-sheet__btn margo-lb-owner-sheet__btn--danger">Delete</button>
  <p id="err" hidden role="alert"></p>
</div>
<script>
  const childEchoCount = ${opts.childEchoCount};
  let deleting = false;
  document.getElementById('del-a').addEventListener('click', () => {
    document.getElementById('sheet').hidden = false;
  });
  document.getElementById('confirm').addEventListener('click', async () => {
    if (deleting) return;
    deleting = true;
    document.getElementById('confirm').textContent = 'Deleting…';
    const res = await fetch('/api/posts/lyric-back', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: 'a' }),
    });
    const body = await res.json();
    if (!res.ok) {
      document.getElementById('err').hidden = false;
      document.getElementById('err').textContent = body.error || 'Could not delete.';
      deleting = false;
      document.getElementById('confirm').textContent = 'Delete';
      return;
    }
    document.getElementById('sheet').hidden = true;
    const row = document.getElementById('row-a');
    const header = document.getElementById('header-count');
    if (body.outcome === 'deleted') {
      row.remove();
      const n = Math.max(0, Number(header.dataset.count) - 1);
      header.dataset.count = String(n);
      header.textContent = 'Lyric Backs ' + n;
    } else {
      row.classList.add('margo-lb-thread-row--content-removed');
      row.dataset.contentRemoved = '1';
      document.getElementById('lyric-a').textContent = 'Deleted';
      document.getElementById('lyric-a').classList.add('margo-lb-thread-row__lyric--removed');
    }
    document.body.dataset.updated = '1';
  });
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('/api/posts/lyric-back') && init?.method === 'DELETE') {
      const outcome = childEchoCount > 0 ? 'shelled' : 'deleted';
      return new Response(JSON.stringify({ success: true, outcome }), { status: 200 });
    }
    if (url.includes('/api/posts/lyric-back') && init?.method === 'DELETE' && childEchoCount < 0) {
      return new Response(JSON.stringify({ error: 'Nope' }), { status: 403 });
    }
    return new Response('{}', { status: 404 });
  };
</script>
</body></html>`

for (const width of [360, 390]) {
  test(`delete updates row immediately — shell (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(FIXTURE({ childEchoCount: 1 }), { waitUntil: 'domcontentloaded' })
    await page.locator('#del-a').click()
    await page.locator('#confirm').click()
    await expect(page.locator('#confirm')).toHaveText('Deleting…')
    await expect.poll(async () => page.evaluate(() => document.body.dataset.updated)).toBe('1')
    await expect(page.locator('[data-content-removed="1"]')).toBeVisible()
    await expect(page.locator('#lyric-a')).toHaveText('Deleted')
    await expect(page.locator('#header-count')).toHaveAttribute('data-count', '2')
  })

  test(`delete updates row immediately — removed (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(FIXTURE({ childEchoCount: 0 }), { waitUntil: 'domcontentloaded' })
    await page.locator('#del-a').click()
    await page.locator('#confirm').click()
    await expect.poll(async () => page.evaluate(() => document.body.dataset.updated)).toBe('1')
    await expect(page.locator('#row-a')).toHaveCount(0)
    await expect(page.locator('#header-count')).toHaveAttribute('data-count', '1')
  })
}
