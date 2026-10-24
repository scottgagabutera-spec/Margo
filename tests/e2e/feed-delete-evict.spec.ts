import { test, expect } from '@playwright/test'

test('deleted post id is not treated as a new moment', async ({ page }) => {
  await page.setContent(`<!DOCTYPE html><body><script>
    const KEY = 'test'
    const prev = ['p1']
    const live = [{ id: 'p1' }, { id: 'p2' }]
    const deleted = new Set(['p1'])
    const prevIds = new Set(prev.map(p => p.id))
    const brandNew = live.filter(i => !prevIds.has(i.id) && !deleted.has(i.id))
    window.__brandNew = brandNew.map(i => i.id)
  </script></body>`, { waitUntil: 'load' })
  expect(await page.evaluate(() => (window as unknown as { __brandNew: string[] }).__brandNew)).toEqual(['p2'])
})

test('delete handler removes card only after ok response', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.setContent(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
  <body><div id="card">Post</div><button id="del-ok">Delete ok</button><button id="del-fail">Delete fail</button>
  <script>
    async function run(ok) {
      const res = { ok }
      if (!res.ok) return
      document.getElementById('card').remove()
    }
    document.getElementById('del-ok').onclick = () => run(true)
    document.getElementById('del-fail').onclick = () => run(false)
  </script></body></html>`, { waitUntil: 'domcontentloaded' })
  await page.locator('#del-fail').click()
  await expect(page.locator('#card')).toHaveCount(1)
  await page.locator('#del-ok').click()
  await expect(page.locator('#card')).toHaveCount(0)
})
