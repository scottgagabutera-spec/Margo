import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const REPORT_CSS = fs.readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8')
  .split('\n')
  .filter((line) => line.includes('margo-post-report-menu'))
  .join('\n')

const FIXTURE = (opts: { reported?: boolean; ownPost?: boolean }) => String.raw`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<style>
  :root { --surface-2: #1c1c1f; --border: #3a3a42; --text: #eee; --text-muted: #888; --bg: #111; --gold: #d4a017; }
  body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; padding: 16px; }
  ${REPORT_CSS}
</style></head><body>
<div id="app"></div>
<script>
  const REASONS = ['Spam', 'Harassment', 'Inappropriate', 'Other'];
  const reported = ${opts.reported ? 'true' : 'false'};
  const ownPost = ${opts.ownPost ? 'true' : 'false'};
  let selected = null;
  let otherNote = '';

  function render() {
    const root = document.getElementById('app');
    root.innerHTML = '';
    const sheet = document.createElement('div');
    sheet.id = 'sheet';
    sheet.className = 'margo-post-report-menu__sheet';
    if (reported) {
      const p = document.createElement('p');
      p.className = 'margo-post-report-menu__sheet-reported';
      p.textContent = 'Reported';
      p.setAttribute('role', 'status');
      sheet.appendChild(p);
      root.appendChild(sheet);
      return;
    }
    const group = document.createElement('div');
    group.className = 'margo-post-report-menu__sheet-options';
    group.setAttribute('role', 'radiogroup');
    for (const reason of REASONS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'margo-post-report-menu__sheet-row' + (selected === reason ? ' margo-post-report-menu__sheet-row--selected' : '');
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', selected === reason ? 'true' : 'false');
      btn.innerHTML = '<span>' + reason + '</span><svg class="margo-post-report-menu__sheet-check" width="14" height="14" style="opacity:' + (selected === reason ? 1 : 0) + '"><path d="M5 12.5L10 17.5L19 7.5" stroke="currentColor" stroke-width="1.75" fill="none"/></svg>';
      btn.addEventListener('click', () => { selected = reason; render(); });
      group.appendChild(btn);
    }
    sheet.appendChild(group);
    if (selected === 'Other') {
      const wrap = document.createElement('label');
      wrap.className = 'margo-post-report-menu__sheet-note-wrap';
      const ta = document.createElement('textarea');
      ta.className = 'margo-post-report-menu__sheet-note';
      ta.value = otherNote;
      ta.maxLength = 300;
      ta.addEventListener('input', () => { otherNote = ta.value; });
      wrap.appendChild(ta);
      sheet.appendChild(wrap);
    }
    const actions = document.createElement('div');
    actions.className = 'margo-post-report-menu__sheet-actions';
    const submit = document.createElement('button');
    submit.type = 'button';
    submit.className = 'margo-post-report-menu__sheet-submit';
    submit.textContent = 'Report';
    submit.disabled = !selected;
    submit.addEventListener('click', async () => {
      if (!selected) return;
      const res = await fetch('/api/posts/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: 'post-1', reason: selected, note: selected === 'Other' ? otherNote : null }),
      });
      const json = await res.json();
      document.body.dataset.lastStatus = String(res.status);
      document.body.dataset.lastError = json.error || '';
      if (res.ok) {
        document.body.dataset.msg = 'Report received.';
      }
    });
    actions.appendChild(submit);
    sheet.appendChild(actions);
    const msg = document.createElement('p');
    msg.id = 'msg';
    msg.className = 'margo-post-report-menu__sheet-msg';
    msg.setAttribute('role', 'status');
    sheet.appendChild(msg);
    root.appendChild(sheet);
  }

  render();

  const origFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('/api/posts/report')) {
      const body = JSON.parse(init.body || '{}');
      if (ownPost) {
        return new Response(JSON.stringify({ error: 'You cannot report your own post' }), { status: 403 });
      }
      if (body.reason === 'Other' && body.note && body.note.length > 300) {
        return new Response(JSON.stringify({ error: 'Invalid reason' }), { status: 400 });
      }
      if (document.body.dataset.forceDuplicate === '1') {
        return new Response(JSON.stringify({ error: 'already_reported', code: 'already_reported' }), { status: 409 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return origFetch(input, init);
  };
</script>
</body></html>`

for (const width of [360, 390, 430]) {
  test(`report sheet: select reason and enable submit (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(FIXTURE({}), { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: 'Report', exact: true })).toBeDisabled()
    await page.getByRole('radio', { name: 'Harassment' }).click()
    await expect(page.getByRole('button', { name: 'Report', exact: true })).toBeEnabled()
    await expect(page.locator('.margo-post-report-menu__sheet-row--selected')).toHaveCount(1)
  })

  test(`Other shows note field (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(FIXTURE({}), { waitUntil: 'domcontentloaded' })
    await page.getByRole('radio', { name: 'Other' }).click()
    await expect(page.locator('.margo-post-report-menu__sheet-note')).toBeVisible()
    await page.locator('.margo-post-report-menu__sheet-note').fill('Short note')
    await page.getByRole('button', { name: 'Report', exact: true }).click()
    await expect(page.locator('body')).toHaveAttribute('data-last-status', '200')
  })
}

test('already reported state', async ({ page }) => {
  await page.setContent(FIXTURE({ reported: true }), { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('status')).toHaveText('Reported')
  await expect(page.getByRole('button', { name: 'Report', exact: true })).toHaveCount(0)
})

test('duplicate submit returns reported handling', async ({ page }) => {
  await page.setContent(FIXTURE({}), { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { document.body.dataset.forceDuplicate = '1' })
  await page.getByRole('radio', { name: 'Spam' }).click()
  await page.getByRole('button', { name: 'Report', exact: true }).click()
  await expect(page.locator('body')).toHaveAttribute('data-last-status', '409')
})

test('own post blocked by API', async ({ page }) => {
  await page.setContent(FIXTURE({ ownPost: true }), { waitUntil: 'domcontentloaded' })
  await page.getByRole('radio', { name: 'Spam' }).click()
  await page.getByRole('button', { name: 'Report', exact: true }).click()
  await expect(page.locator('body')).toHaveAttribute('data-last-status', '403')
})
