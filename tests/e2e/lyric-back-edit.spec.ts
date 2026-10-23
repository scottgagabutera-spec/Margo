import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const CSS_MARKERS = [
  'margo-post-report-menu',
  'margo-lb-edit-layer',
  'margo-lb-thread-row',
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
  const initialVibe = 'Chill'
  const nextVibe = scenario === 'vibe' ? 'Joy' : initialVibe
  const initialLine = 'Original line'
  const nextLine = scenario === 'line' || scenario === 'full' ? 'Updated line' : initialLine
  const initialSong = 'Song A'
  const nextSong = scenario === 'song' || scenario === 'full' ? 'Song B' : initialSong
  return String.raw`<!DOCTYPE html>
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
  <li><article class="margo-lb-thread-row" id="row-edit" data-echo-id="edit-me">
    <p class="margo-lb-thread-row__lyric" id="lyric-edit">${initialLine}</p>
    <span class="margo-lb-thread-row__song" id="song-edit">${initialSong}</span>
    <span data-vibe="${initialVibe}" id="vibe-edit"></span>
  </article></li>
</ul>
<div id="edit-layer" hidden class="margo-lb-edit-layer" style="position:fixed;inset:0;background:var(--surface);z-index:245;">
  <p class="margo-lb-edit-layer__title">Edit Lyric Back</p>
  <div class="margo-lb-edit-layer__vibes" role="listbox">
    <button type="button" role="option" data-vibe="Chill">Chill</button>
    <button type="button" role="option" data-vibe="Joy">Joy</button>
  </div>
  <input id="field-song" value="${initialSong}" aria-label="Song"/>
  <textarea id="field-line">${initialLine}</textarea>
  <button type="button" id="save" aria-label="Save">Send</button>
  <p id="layer-err" hidden role="alert"></p>
</div>
<script>
  const scenario = ${JSON.stringify(scenario)};
  let saving = false;
  let vibe = ${JSON.stringify(initialVibe)};
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
      document.getElementById('edit-layer').hidden = false;
      document.body.style.overflow = 'hidden';
    });
    menu.appendChild(edit);
    document.body.appendChild(menu);
  }
  document.getElementById('more').addEventListener('click', openMenu);
  document.querySelectorAll('[data-vibe]').forEach(btn => {
    btn.addEventListener('click', () => {
      vibe = btn.getAttribute('data-vibe');
      document.querySelectorAll('[role=option]').forEach(o => o.setAttribute('aria-selected', o.getAttribute('data-vibe') === vibe ? 'true' : 'false'));
    });
  });
  document.getElementById('save').addEventListener('click', async () => {
    if (saving) return;
    saving = true;
    const btn = document.getElementById('save');
    btn.innerHTML = '<span class="margo-post-card__lb-compose-saving">Saving…</span>';
    const song = document.getElementById('field-song').value;
    const line = document.getElementById('field-line').value;
    const emotion = vibe === 'Joy' ? 'joy' : 'chill';
    const res = await fetch('/api/posts/lyric-back', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId: 'edit-me',
        text: line,
        songTitle: song,
        artistName: 'Artist',
        emotion,
        songId: null,
        snippetStartSec: null,
        snippetEndSec: null,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      document.getElementById('layer-err').hidden = false;
      document.getElementById('layer-err').textContent = body.error || 'Could not save.';
      saving = false;
      btn.textContent = 'Save';
      return;
    }
    document.getElementById('edit-layer').hidden = true;
    document.body.style.overflow = '';
    document.getElementById('lyric-edit').textContent = line;
    document.getElementById('song-edit').textContent = song;
    document.getElementById('vibe-edit').setAttribute('data-vibe', vibe);
    document.body.dataset.patchStatus = String(res.status);
    document.body.dataset.childUntouched = document.getElementById('lyric-parent').textContent;
  });
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('/api/posts/lyric-back') && init?.method === 'PATCH') {
      const payload = JSON.parse(init.body || '{}');
      if (scenario === 'song') {
        if (payload.songTitle === ${JSON.stringify(initialSong)}) {
          return new Response(JSON.stringify({ error: 'Change song' }), { status: 400 });
        }
      }
      return new Response(JSON.stringify({ id: payload.postId, emotion: payload.emotion }), { status: 200 });
    }
    return new Response('{}', { status: 404 });
  };
  window.addEventListener('DOMContentLoaded', () => {
    if (scenario === 'line' || scenario === 'full') {
      document.getElementById('field-line').value = ${JSON.stringify(nextLine)};
    }
    if (scenario === 'song' || scenario === 'full') {
      document.getElementById('field-song').value = ${JSON.stringify(nextSong)};
    }
    if (scenario === 'vibe') vibe = ${JSON.stringify(nextVibe)};
  });
</script>
</body></html>`
}

for (const scenario of ['full', 'song', 'line', 'vibe'] as const) {
  test(`owner edit ${scenario} flow (390px)`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setContent(fixture(scenario), { waitUntil: 'domcontentloaded' })
    await page.locator('#more').click()
    await page.getByRole('menuitem', { name: 'Edit' }).click()
    await expect(page.locator('.margo-lb-edit-layer')).toBeVisible()
    if (scenario === 'vibe') {
      await page.getByRole('option', { name: 'Joy' }).click()
    }
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
    await expect(page.locator('#edit-layer')).toBeHidden()
  })
}
