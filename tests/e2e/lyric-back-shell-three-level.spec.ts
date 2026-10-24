import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const CSS_MARKERS = ['margo-feed-actions', 'margo-feed-action', 'margo-lb-thread-row'] as const

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

/** Level 1 → shelled level 2 → level 3 child; LB on shell drills to level 3. */
const FIXTURE = String.raw`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  :root { --surface-2: #1c1c1f; --border: #3a3a42; --text: #eee; --text-muted: #888; --text-secondary: #aaa; --bg: #111; --post-vibe-text: #d4a017; --feed-type-feed-action-label: 0.625rem; --feed-type-action-count: 0.55rem; }
  body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; }
  ${LB_CSS}
</style></head><body>
<div id="level1">
  <p id="level1-label">Level 1 lyric</p>
  <article class="margo-lb-thread-row margo-lb-thread-row--content-removed" data-echo-id="shell-mid" data-content-removed="1">
    <p class="margo-lb-thread-row__lyric margo-lb-thread-row__lyric--removed">Deleted</p>
    <div class="margo-feed-actions margo-feed-actions--compact" data-no-card-nav>
      <button type="button" class="margo-feed-action margo-feed-action--inactive" disabled aria-hidden="true" tabindex="-1"><span class="margo-feed-action__label">Resonate</span></button>
      <button type="button" class="margo-feed-action" id="shell-lb-btn" aria-label="Open Lyric Back">
        <span class="margo-feed-action__icon-wrap"><span class="margo-feed-action__badge">1</span></span>
        <span class="margo-feed-action__label">Lyric Back</span>
      </button>
      <button type="button" class="margo-feed-action margo-feed-action--inactive" disabled aria-hidden="true"><span class="margo-feed-action__label">Card</span></button>
    </div>
  </article>
</div>
<div id="level3" hidden>
  <p id="level3-label">Level 3 child lyric</p>
</div>
<script>
  document.getElementById('shell-lb-btn').addEventListener('click', () => {
    document.getElementById('level1').hidden = true;
    document.getElementById('level3').hidden = false;
    document.body.dataset.focus = 'level3';
  });
</script>
</body></html>`

for (const width of [360, 390]) {
  test(`3-level chain: shell middle keeps active Lyric Back (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(FIXTURE, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-content-removed="1"]')).toBeVisible()
    await expect(page.locator('.margo-feed-action--inactive').first()).toBeDisabled()
    const lb = page.getByRole('button', { name: 'Open Lyric Back' })
    await expect(lb).toBeEnabled()
    await expect(lb).not.toHaveClass(/margo-feed-action--inactive/)
    await lb.click()
    await expect(page.locator('#level3-label')).toBeVisible()
    await expect(page.locator('#level3-label')).toHaveText('Level 3 child lyric')
  })
}
