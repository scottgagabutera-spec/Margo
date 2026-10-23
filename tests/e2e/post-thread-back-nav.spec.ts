import { test, expect } from '@playwright/test'

/** Stack-only harness (mirrors in-app-nav-stack + chrome Back rules). */
const HARNESS = String.raw`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body { margin: 0; font-family: system-ui, sans-serif; background: #111; color: #eee; padding: 16px; }
  .screen { display: none; }
  .screen--on { display: block; }
  #back { min-height: 44px; min-width: 44px; }
  a.parent { display: block; margin: 12px 0; color: gold; cursor: pointer; }
</style></head><body>
<button type="button" id="back" aria-label="Back">Back</button>
<div id="feed" class="screen screen--on"><p>Feed</p>
  <button type="button" id="open-a">Open moment A</button>
</div>
<div id="post-a" class="screen"><p>Moment A</p>
  <button type="button" id="open-b">Open Lyric Back B</button>
</div>
<div id="post-b" class="screen"><p>Lyric Back B</p>
  <a class="parent" id="quote-a">Parent quote A</a>
</div>
<div id="deep" class="screen"><p>Deep link B</p></div>
<div id="compose" class="screen"><p>Moment A + compose open</p></div>
<script>
  let memStack = ['/feed'];
  function read() { return memStack.slice(); }
  function write(s) { memStack = s.slice(-32); }
  function reset(p) { write([p]); }
  function push(p) {
    const s = read();
    if (s[s.length - 1] === p) return;
    write([...s, p]);
  }
  function pop() {
    const s = read();
    if (s.length <= 1) return;
    write(s.slice(0, -1));
  }
  function replaceTop(p) {
    const s = read();
    if (!s.length) { write([p]); return; }
    const n = [...s]; n[n.length - 1] = p; write(n);
  }
  function prev() {
    const s = read();
    return s.length >= 2 ? s[s.length - 2] : null;
  }
  function show(id) {
    document.querySelectorAll('.screen').forEach((el) => el.classList.remove('screen--on'));
    document.getElementById(id).classList.add('screen--on');
    document.body.dataset.screen = id;
  }
  function screenForPath(path) {
    if (path === '/feed') return 'feed';
    if (path === '/post/a') return 'post-a';
    if (path === '/post/b') return 'post-b';
    if (path === '/post/deep') return 'deep';
    return 'feed';
  }
  function navToPost(postId) {
    const href = '/post/' + postId;
    const p = prev();
    if (p === href && read().length > 1) {
      pop();
      show(screenForPath(read()[read().length - 1] || '/feed'));
      return;
    }
    replaceTop(href);
    push(href);
    show(screenForPath(href));
  }
  function chromeBack(fallback) {
    if (document.body.dataset.composeOpen === '1') {
      document.body.dataset.composeOpen = '0';
      show('post-a');
      return;
    }
    if (read().length > 1) {
      pop();
      const top = read()[read().length - 1] || fallback;
      show(screenForPath(top));
      return;
    }
    replaceTop(fallback);
    show(screenForPath(fallback));
  }
  reset('/feed');
  document.getElementById('open-a').onclick = () => { push('/post/a'); show('post-a'); };
  document.getElementById('open-b').onclick = () => { push('/post/b'); show('post-b'); };
  document.getElementById('quote-a').onclick = (e) => { e.preventDefault(); navToPost('a'); };
  document.getElementById('back').onclick = () => chromeBack('/feed');
  window.__openCompose = () => {
    document.body.dataset.composeOpen = '1';
    show('compose');
  };
  window.__openDeep = () => {
    reset('/post/deep');
    show('deep');
  };
  window.__stackDepth = () => read().length;
</script>
</body></html>`

for (const width of [360, 390, 430]) {
  test(`feed → A → B → Back → A → Back → feed (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(HARNESS, { waitUntil: 'domcontentloaded' })
    await page.locator('#open-a').click()
    await expect(page.locator('#post-a')).toHaveClass(/screen--on/)
    await page.locator('#open-b').click()
    await expect(page.locator('#post-b')).toHaveClass(/screen--on/)
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page.locator('#post-a')).toHaveClass(/screen--on/)
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page.locator('#feed')).toHaveClass(/screen--on/)
    await page.locator('#open-a').click()
    await page.locator('#open-b').click()
    await page.getByRole('button', { name: 'Back' }).click()
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page.locator('#feed')).toHaveClass(/screen--on/)
  })

  test(`parent quote uses back when parent is previous (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(HARNESS, { waitUntil: 'domcontentloaded' })
    await page.locator('#open-a').click()
    await page.locator('#open-b').click()
    await page.locator('#quote-a').click()
    await expect(page.locator('#post-a')).toHaveClass(/screen--on/)
    const depth = await page.evaluate(() => (window as unknown as { __stackDepth?: () => number }).__stackDepth?.() ?? 0)
    expect(depth).toBeLessThanOrEqual(2)
  })

  test(`deep link Back replaces to feed (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(HARNESS, { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => (window as unknown as { __openDeep: () => void }).__openDeep())
    await expect(page.locator('#deep')).toHaveClass(/screen--on/)
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page.locator('#feed')).toHaveClass(/screen--on/)
  })

  test(`compose open: first Back closes panel (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(HARNESS, { waitUntil: 'domcontentloaded' })
    await page.locator('#open-a').click()
    await page.evaluate(() => (window as unknown as { __openCompose: () => void }).__openCompose())
    await expect(page.locator('#compose')).toHaveClass(/screen--on/)
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page.locator('#post-a')).toHaveClass(/screen--on/)
    await expect(page.locator('#compose')).not.toHaveClass(/screen--on/)
  })
}
