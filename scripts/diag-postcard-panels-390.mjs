/**
 * 390×844 gate for Feed PostCard swipe panels.
 * Measures tile width / gap / rest peek and captures screenshots.
 *
 * Usage:
 *   BASE=http://127.0.0.1:3000 node scripts/diag-postcard-panels-390.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const BASE = process.env.BASE || process.env.PROD_URL || 'http://127.0.0.1:3000'
const dir = resolve(process.cwd(), 'scripts/_panel-390')
mkdirSync(dir, { recursive: true })

const lines = []
const results = []
const log = (m) => {
  console.log(m)
  lines.push(m)
}
const pass = (name, detail = '') => {
  results.push({ name, status: 'PASS', detail })
  log(`[PASS] ${name}${detail ? ' — ' + detail : ''}`)
}
const fail = (name, detail = '') => {
  results.push({ name, status: 'FAIL', detail })
  log(`[FAIL] ${name}${detail ? ' — ' + detail : ''}`)
}

async function measure(page) {
  return page.evaluate(() => {
    const row = document.querySelector('.margo-post-panel-row')
    if (!row) return { error: 'no .margo-post-panel-row on first cards' }
    const panels = [...row.querySelectorAll('.margo-post-panel')]
    if (panels.length < 2) return { error: 'fewer than 2 panels', count: panels.length }
    const rowR = row.getBoundingClientRect()
    const r0 = panels[0].getBoundingClientRect()
    const r1 = panels[1].getBoundingClientRect()
    const peek = Math.round((rowR.right - r1.left) * 10) / 10
    const gap = Math.round((r1.left - r0.right) * 10) / 10
    const counter = row.parentElement?.innerText?.match(/\d+\s*\/\s*\d+/)?.[0] || null
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      scroller: { w: Math.round(rowR.width * 10) / 10, left: Math.round(rowR.left * 10) / 10 },
      panel0: {
        id: panels[0].getAttribute('data-panel'),
        w: Math.round(r0.width * 10) / 10,
        h: Math.round(r0.height * 10) / 10,
      },
      panel1: {
        id: panels[1].getAttribute('data-panel'),
        w: Math.round(r1.width * 10) / 10,
        h: Math.round(r1.height * 10) / 10,
        peek,
      },
      gap,
      scrollLeft: row.scrollLeft,
      counter,
      panelIds: panels.map((p) => p.getAttribute('data-panel')),
    }
  })
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
})
const page = await context.newPage()

try {
  await page.goto(`${BASE}/feed`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)

  const found = await page.evaluate(() => {
    const rows = document.querySelectorAll('.margo-post-panel-row')
    return rows.length
  })
  if (!found) {
    fail('row present', `0 rows after load (BASE=${BASE})`)
  } else {
    pass('row present', `${found} strip(s)`)
  }

  const rest = await measure(page)
  writeFileSync(resolve(dir, 'measure-rest.json'), JSON.stringify(rest, null, 2))
  log(`REST ${JSON.stringify(rest)}`)
  await page.screenshot({ path: resolve(dir, '01-rest.png'), fullPage: false })

  if (rest.error) {
    fail('measure rest', rest.error)
  } else {
    if (rest.viewport.w === 390) pass('viewport 390', `${rest.viewport.w}×${rest.viewport.h}`)
    else fail('viewport 390', JSON.stringify(rest.viewport))

    if (rest.panel0.w >= 250 && rest.panel0.w <= 262) pass('tile width ~256', `${rest.panel0.w}px`)
    else fail('tile width ~256', `${rest.panel0.w}px`)

    if (rest.gap >= 10 && rest.gap <= 14) pass('gap ~12', `${rest.gap}px`)
    else fail('gap ~12', `${rest.gap}px`)

    if (rest.panel1.peek >= 40) pass('peek ≥40', `${rest.panel1.peek}px of ${rest.panel1.id}`)
    else fail('peek ≥40', `${rest.panel1.peek}px`)

    if (rest.counter) pass('counter', rest.counter)
    else fail('counter', 'missing')
  }

  await page.evaluate(() => {
    const row = document.querySelector('.margo-post-panel-row')
    const p1 = row?.querySelectorAll('.margo-post-panel')[1]
    p1?.scrollIntoView({ inline: 'start', block: 'nearest' })
  })
  await page.waitForTimeout(600)
  const snapped = await measure(page)
  writeFileSync(resolve(dir, 'measure-panel2.json'), JSON.stringify(snapped, null, 2))
  log(`PANEL2 ${JSON.stringify(snapped)}`)
  await page.screenshot({ path: resolve(dir, '02-panel2.png'), fullPage: false })

  if (!snapped.error && snapped.panel1) {
    const coverOrPlay = snapped.panelIds?.[1]
    pass('snapped panel 2', coverOrPlay || 'ok')
  }

  const failed = results.filter((r) => r.status === 'FAIL').length
  writeFileSync(resolve(dir, 'results.json'), JSON.stringify({ BASE, results, rest, snapped }, null, 2))
  writeFileSync(resolve(dir, 'log.txt'), lines.join('\n'))
  if (failed) {
    log(`DONE with ${failed} FAIL(s)`)
    process.exitCode = 1
  } else {
    log('DONE all PASS')
  }
} catch (err) {
  fail('script', err?.message || String(err))
  await page.screenshot({ path: resolve(dir, 'error.png'), fullPage: false }).catch(() => {})
  writeFileSync(resolve(dir, 'results.json'), JSON.stringify({ BASE, results, error: String(err) }, null, 2))
  writeFileSync(resolve(dir, 'log.txt'), lines.join('\n'))
  process.exitCode = 1
} finally {
  await browser.close()
}
