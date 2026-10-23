import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const CSS_MARKERS = [
  'margo-post-report-menu',
  'margo-lb-thread-row',
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

const LB_CSS = extractCss(fs.readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8'))

type EditScenario = 'full' | 'song' | 'line' | 'vibe'

function fixture(scenario: EditScenario) {
  const initialLine = 'Original line'
  const nextLine = scenario === 'line' || scenario === 'full' ? 'Updated line' : initialLine
  const initialSong = 'Song A'
  const nextSong = scenario === 'song' || scenario === 'full' ? 'Song B' : initialSong
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<style>
  :root { --surface: #0F0E13; --surface-2: #1c1c1f; --border: #3a3a42; --text: #eee; --text-secondary: #aaa; --bg: #111; --gold: #d4a017; }
  body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; }
  ${LB_CSS}
</style></head><body>
<button type="button" class="margo-post-report-menu__trigger" id="more" aria-label="More actions">⋯</button>
<ul id="list">
  <li><article class="margo-lb-thread-row" id="row-parent" data-echo-id="parent">
    <p class="margo-lb-thread-row__lyric" id="lyric-parent">Parent LB</p>
  </article></li>
  <li id="edit-slot"></li>
</ul>
<script>
  const scenario = ${JSON.stringify(scenario)};
  const initialLine = ${JSON.stringify(initialLine)};
  const nextLine = ${JSON.stringify(nextLine)};
  const initialSong = ${JSON.stringify(initialSong)};
  const nextSong = ${JSON.stringify(nextSong)};
  function renderEdit() {
    const slot = document.getElementById('edit-slot');
    slot.innerHTML = '';
    const article = document.createElement('article');
    article.className = 'margo-lb-thread-row margo-lb-thread-row--editing';
    article.id = 'row-edit';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'margo-lb-thread-row__edit-cancel';
    cancel.id = 'cancel';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => { document.body.dataset.cancelled = '1'; slot.innerHTML = ''; });
    const compose = document.createElement('div');
    compose.className = 'margo-post-card__lb-compose margo-post-card__lb-compose--panel';
    const songInput = document.createElement('input');
    songInput.id = 'field-song';
    songInput.value = scenario === 'song' || scenario === 'full' ? nextSong : initialSong;
    songInput.setAttribute('aria-label', 'Search');
    const lineInput = document.createElement('textarea');
    lineInput.id = 'field-line';
    lineInput.value = scenario === 'line' || scenario === 'full' ? nextLine : initialLine;
    const save = document.createElement('button');
    save.type = 'button';
    save.id = 'save';
    save.className = 'margo-post-card__lb-compose-send';
    save.setAttribute('aria-label', 'Save');
    save.textContent = 'Save';
    save.addEventListener('click', () => void saveEdit());
    const err = document.createElement('p');
    err.id = 'compose-err';
    err.hidden = true;
    err.setAttribute('role', 'alert');
    compose.append(songInput, lineInput, save, err);
    const lyric = document.createElement('p');
    lyric.className = 'margo-lb-thread-row__lyric';
    lyric.id = 'lyric-edit';
    lyric.textContent = initialLine;
    const songSpan = document.createElement('span');
    songSpan.className = 'margo-lb-thread-row__song';
    songSpan.id = 'song-edit';
    songSpan.textContent = initialSong;
    article.append(cancel, compose, lyric, songSpan);
    slot.appendChild(article);
  }
  function openMenu() {
    const menu = document.createElement('div');
    menu.className = 'margo-post-report-menu__popover';
    menu.style.position = 'fixed';
    menu.style.top = '80px';
    menu.style.left = '16px';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.setAttribute('role', 'menuitem');
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => {
      document.body.dataset.action = 'edit';
      menu.remove();
      renderEdit();
    });
    menu.appendChild(edit);
    document.body.appendChild(menu);
  }
  document.getElementById('more').addEventListener('click', openMenu);
  async function saveEdit() {
    const btn = document.getElementById('save');
    btn.innerHTML = '<span class="margo-post-card__lb-compose-saving">Saving…</span>';
    const song = document.getElementById('field-song').value;
    const line = document.getElementById('field-line').value;
    const res = await fetch('/api/posts/lyric-back', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId: 'edit-me',
        text: line,
        songTitle: song,
        artistName: 'Artist',
        emotion: 'chill',
        songId: null,
        snippetStartSec: null,
        snippetEndSec: null,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      document.getElementById('compose-err').hidden = false;
      document.getElementById('compose-err').textContent = body.error || 'Could not save.';
      return;
    }
    document.getElementById('lyric-edit').textContent = line;
    document.getElementById('song-edit').textContent = song;
    document.body.dataset.patchStatus = String(res.status);
    document.body.dataset.childUntouched = document.getElementById('lyric-parent').textContent;
  }
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('/api/posts/lyric-back') && init?.method === 'PATCH') {
      return new Response(JSON.stringify({ id: 'edit-me', emotion: 'chill' }), { status: 200 });
    }
    return new Response('{}', { status: 404 });
  };
</script>
</body></html>`
}

for (const scenario of ['full', 'song', 'line', 'vibe'] as const) {
  test(`owner edit in-place ${scenario} (390px)`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setContent(fixture(scenario), { waitUntil: 'domcontentloaded' })
    await page.locator('#more').click()
    await page.getByRole('menuitem', { name: 'Edit' }).click()
    await expect(page.locator('.margo-lb-thread-row--editing')).toBeVisible()
    await expect(page.locator('.margo-post-card__lb-compose--panel')).toBeVisible()
    await page.locator('#save').click()
    await expect(page.locator('.margo-post-card__lb-compose-saving')).toHaveText('Saving…')
    await expect.poll(async () => page.evaluate(() => document.body.dataset.patchStatus)).toBe('200')
    const expectedLine =
      scenario === 'line' || scenario === 'full' ? 'Updated line' : 'Original line'
    const expectedSong =
      scenario === 'song' || scenario === 'full' ? 'Song B' : 'Song A'
    await expect(page.locator('#lyric-edit')).toHaveText(expectedLine)
    await expect(page.locator('#song-edit')).toHaveText(expectedSong)
    await expect.poll(async () =>
      page.evaluate(() => document.body.dataset.childUntouched),
    ).toBe('Parent LB')
  })
}
