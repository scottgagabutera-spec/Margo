/**
 * Tap-to-paint ms for Resonate / Repost on feed (mobile viewport).
 * Usage: PLAYWRIGHT_BASE_URL=... node scripts/measure-feed-actions.mjs
 */
import { chromium } from 'playwright'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://margo-git-fix-egress-reduction-bgss-projects-0f517fe3.vercel.app'

async function measure(page, label, tap) {
  const samples = []
  for (let i = 0; i < 6; i++) {
    const ms = await page.evaluate(async (fnBody) => {
      const tap = new Function(`return (${fnBody})`)()
      const card = document.querySelector('.margo-post-card')
      if (!card) return null
      const t0 = performance.now()
      tap()
      const btn0 = document.querySelector('.margo-post-card button[aria-label="Resonate"], .margo-post-card button[aria-label="Remove resonate"]')
      const label0 = btn0?.getAttribute('aria-label')
      await new Promise((resolve) => {
        const run = () => {
          const btn = document.querySelector('.margo-post-card button[aria-label="Resonate"], .margo-post-card button[aria-label="Remove resonate"]')
          const changed = btn && btn.getAttribute('aria-label') !== label0
          if (changed || performance.now() - t0 > 500) {
            resolve(Math.round(performance.now() - t0))
            return
          }
          requestAnimationFrame(run)
        }
        requestAnimationFrame(run)
      })
      return Math.round(performance.now() - t0)
    }, tap.toString())
    if (ms != null) samples.push(ms)
    await page.waitForTimeout(120)
  }
  const avg = samples.length ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length) : null
  console.log(JSON.stringify({ label, samples, avgMs: avg }))
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForSelector('.margo-post-card', { timeout: 45000 }).catch(() => {})

await measure(
  page,
  'resonate',
  () => {
    const btn = document.querySelector('.margo-post-card button[aria-label="Resonate"], .margo-post-card button[aria-label="Remove resonate"]')
    btn?.click()
  },
)

await measure(
  page,
  'repost',
  () => {
    const btn = [...document.querySelectorAll('.margo-post-card button')].find((b) => /repost|replay/i.test(b.getAttribute('aria-label') || ''))
    btn?.click()
  },
)

await browser.close()
