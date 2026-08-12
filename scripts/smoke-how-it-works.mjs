/**
 * Cropped 390px screenshot of landing how-it-works row.
 * Usage: BASE=http://localhost:3000 node scripts/smoke-how-it-works.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
import { resolve } from 'path'

const BASE = process.env.BASE || 'http://localhost:3000'
const outDir = resolve(process.cwd(), 'scripts/_smoke-artifacts')
mkdirSync(outDir, { recursive: true })

async function main() {
  let browser
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' })
  } catch {
    browser = await chromium.launch({ headless: true })
  }
  const page = await browser.newPage()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(2500)
  const el = page.locator('.margo-how-it-works')
  await el.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const box = await el.boundingBox()
  const metrics = await el.evaluate((node) => {
    const grid = node.querySelector('.margo-how-it-works__grid')
    const cols = grid ? getComputedStyle(grid).gridTemplateColumns : null
    const bodies = [...node.querySelectorAll('.margo-how-it-works__body')].map((p) => {
      const cs = getComputedStyle(p)
      return {
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        lines: Math.round(p.getBoundingClientRect().height / (parseFloat(cs.lineHeight) || 1)),
        text: p.textContent,
      }
    })
    return { cols, bodies }
  })
  console.log(JSON.stringify(metrics, null, 2))
  const out = resolve(outDir, 'how-it-works-390.png')
  await el.screenshot({ path: out })
  console.log('wrote', out, 'box', box)
  // Also full viewport crop around the section
  if (box) {
    await page.screenshot({
      path: resolve(outDir, 'how-it-works-390-viewport.png'),
      clip: {
        x: 0,
        y: Math.max(0, box.y - 12),
        width: 390,
        height: Math.min(844, box.height + 24),
      },
    })
  }
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
