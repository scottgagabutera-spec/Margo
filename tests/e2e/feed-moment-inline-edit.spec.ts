import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const CSS_MARKERS = [
  'margo-post-moment-edit',
  'margo-post-card__lb-compose',
  'margo-post-card__lb-compose-saving',
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

const CSS = extractCss(fs.readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8'))

function fixture(scenario: 'song' | 'line' | 'vibe') {
  const nextLine = scenario === 'line' ? 'New lyric line' : 'Hello world'
  const nextSong = scenario === 'song' ? 'New Song Title' : 'Original Song'
  const nextEmotion = scenario === 'vibe' ? 'joy' : 'chill'
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  :root { --surface-2: #1c1c1f; --border: #3a3a42; --text: #eee; --gold: #d4a017; --bg: #111; }
  body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; }
  ${CSS}
</style></head><body>
<div class="margo-post-card margo-post-card--editing">
  <div class="margo-post-moment-edit">
    <div class="margo-post-moment-edit__vibes" role="listbox">
      <button type="button" role="option" data-vibe="Chill">Chill</button>
      <button type="button" role="option" data-vibe="Joy">Joy</button>
    </div>
    <div class="margo-post-card__lb-compose margo-post-card__lb-compose--panel">
      <input id="song" value="${nextSong}" />
      <textarea id="line">${nextLine}</textarea>
      <button type="button" id="save" aria-label="Save">Save</button>
    </div>
  </div>
  <p id="lb-below">Lyric Backs below unchanged</p>
</div>
<script>
  const scenario = ${JSON.stringify(scenario)};
  if (scenario === 'vibe') {
    document.querySelector('[data-vibe="Joy"]').classList.add('margo-post-moment-edit__vibe--on');
  }
  document.getElementById('save').addEventListener('click', async () => {
    const btn = document.getElementById('save');
    btn.innerHTML = '<span class="margo-post-card__lb-compose-saving">Saving…</span>';
    const emotion = scenario === 'vibe' ? 'joy' : 'chill';
    const res = await fetch('/api/posts/moment', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId: 'moment-1',
        emotion,
        lines: [{
          text: document.getElementById('line').value,
          song_title: document.getElementById('song').value,
          artist_name: 'Artist',
          song_id: '',
          artwork_url: '',
          snippet_start_sec: '',
          snippet_end_sec: '',
          source: 'external',
        }],
      }),
    });
    document.body.dataset.status = String(res.status);
    document.body.dataset.lb = document.getElementById('lb-below').textContent;
  });
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('/api/posts/moment') && init?.method === 'PATCH') {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    return new Response('{}', { status: 404 });
  };
</script>
</body></html>`
}

for (const scenario of ['song', 'line', 'vibe'] as const) {
  test(`feed moment inline edit ${scenario} (390px)`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setContent(fixture(scenario), { waitUntil: 'domcontentloaded' })
    if (scenario === 'vibe') {
      await page.getByRole('option', { name: 'Joy' }).click()
    }
    await page.locator('#save').click()
    await expect(page.locator('.margo-post-card__lb-compose-saving')).toHaveText('Saving…')
    await expect.poll(async () => page.evaluate(() => document.body.dataset.status)).toBe('200')
    await expect.poll(async () => page.evaluate(() => document.body.dataset.lb)).toBe('Lyric Backs below unchanged')
  })
}
