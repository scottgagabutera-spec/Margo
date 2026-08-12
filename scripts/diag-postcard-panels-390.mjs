/**
 * 390×844 gate for Feed PostCard Stories-style pages.
 *
 * Usage:
 *   BASE=https://preview.vercel.app node scripts/diag-postcard-panels-390.mjs
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

async function measureRow(page, rowIndex = 0) {
  return page.evaluate((idx) => {
    const rows = [...document.querySelectorAll('.margo-post-panel-row')]
    const row = rows[idx]
    if (!row) return { error: `no row at ${idx}`, rowCount: rows.length }
    const panels = [...row.querySelectorAll('.margo-post-panel')]
    if (panels.length < 2) return { error: 'fewer than 2 panels', count: panels.length }
    const rowR = row.getBoundingClientRect()
    const rects = panels.map((p) => {
      const r = p.getBoundingClientRect()
      return {
        id: p.getAttribute('data-panel'),
        w: Math.round(r.width * 10) / 10,
        h: Math.round(r.height * 10) / 10,
        left: Math.round(r.left * 10) / 10,
      }
    })
    const peek = rects[1] ? Math.round((rowR.right - rects[1].left) * 10) / 10 : null
    const gap = rects[1] ? Math.round((rects[1].left - (rects[0].left + rects[0].w)) * 10) / 10 : null
    const heights = rects.map((r) => r.h)
    const heightEqual = heights.every((h) => Math.abs(h - heights[0]) <= 1)
    const counter = row.parentElement?.innerText?.match(/\d+\s*\/\s*\d+/)?.[0] || null
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      scroller: { w: Math.round(rowR.width * 10) / 10, h: Math.round(rowR.height * 10) / 10 },
      rects,
      peek,
      gap,
      heightEqual,
      scrollLeft: Math.round(row.scrollLeft),
      counter,
      panelIds: rects.map((r) => r.id),
    }
  }, rowIndex)
}

async function findStitchRowIndex(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('.margo-post-panel-row')]
    for (let i = 0; i < cards.length; i++) {
      const text = (cards[i].textContent || '').toLowerCase()
      if (text.includes('stitch')) return i
    }
    let tallest = { i: 0, h: 0 }
    for (let i = 0; i < cards.length; i++) {
      const h = cards[i].getBoundingClientRect().height
      if (h > tallest.h) tallest = { i, h }
    }
    return tallest.i
  })
}

async function snapRow(page, rowIndex, panelIndex) {
  await page.evaluate(({ idx, panel }) => {
    const row = document.querySelectorAll('.margo-post-panel-row')[idx]
    if (!row) return
    const target = row.querySelectorAll('.margo-post-panel')[panel]
    target?.scrollIntoView({ inline: 'start', block: 'nearest' })
    row.scrollLeft = panel * row.clientWidth
  }, { idx: rowIndex, panel: panelIndex })
  await page.waitForTimeout(500)
}

const browser = await chromium.launch({
  headless: true,
  channel: process.env.PW_CHANNEL || 'msedge',
})
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

  const found = await page.evaluate(() => document.querySelectorAll('.margo-post-panel-row').length)
  if (!found) fail('row present', `0 rows (BASE=${BASE})`)
  else pass('row present', `${found} strip(s)`)

  const rest = await measureRow(page, 0)
  writeFileSync(resolve(dir, 'measure-rest.json'), JSON.stringify(rest, null, 2))
  log(`REST ${JSON.stringify(rest)}`)
  await page.screenshot({ path: resolve(dir, '01-rest.png'), fullPage: false })

  if (rest.error) {
    fail('measure rest', rest.error)
  } else {
    if (rest.viewport.w === 390) pass('viewport 390', `${rest.viewport.w}×${rest.viewport.h}`)
    else fail('viewport 390', JSON.stringify(rest.viewport))

    const w = rest.rects[0].w
    if (Math.abs(w - rest.scroller.w) <= 2) pass('panel width = scroller', `${w} vs ${rest.scroller.w}`)
    else fail('panel width = scroller', `${w} vs ${rest.scroller.w}`)

    if (Math.abs(rest.gap) <= 2) pass('gap ~0', `${rest.gap}px`)
    else fail('gap ~0', `${rest.gap}px`)

    if (rest.peek <= 2) pass('no peek', `${rest.peek}px`)
    else fail('no peek', `${rest.peek}px`)

    if (rest.heightEqual) pass('equal panel heights', rest.rects.map((r) => r.h).join('/'))
    else fail('equal panel heights', rest.rects.map((r) => `${r.id}:${r.h}`).join(' '))

    if (rest.counter) pass('counter', rest.counter)
    else fail('counter', 'missing')

    if (!(rest.panelIds || []).includes('cover')) pass('no cover panel', (rest.panelIds || []).join(','))
    else fail('no cover panel', (rest.panelIds || []).join(','))
  }

  await snapRow(page, 0, 1)
  const p2 = await measureRow(page, 0)
  writeFileSync(resolve(dir, 'measure-panel2.json'), JSON.stringify(p2, null, 2))
  log(`PANEL2 ${JSON.stringify(p2)}`)
  await page.screenshot({ path: resolve(dir, '02-panel2.png'), fullPage: false })
  if (!p2.error) pass('snapped panel 2', (p2.panelIds || [])[1] || 'ok')

  const stitchIdx = await findStitchRowIndex(page)
  await page.evaluate((idx) => {
    const row = document.querySelectorAll('.margo-post-panel-row')[idx]
    row?.scrollIntoView({ block: 'center' })
  }, stitchIdx)
  await page.waitForTimeout(400)
  await snapRow(page, stitchIdx, 0)
  const stitchRest = await measureRow(page, stitchIdx)
  writeFileSync(resolve(dir, 'measure-stitch-rest.json'), JSON.stringify(stitchRest, null, 2))
  log(`STITCH_REST idx=${stitchIdx} ${JSON.stringify(stitchRest)}`)
  await page.screenshot({ path: resolve(dir, '03-stitch-rest.png'), fullPage: false })

  await snapRow(page, stitchIdx, 1)
  const stitchP2 = await measureRow(page, stitchIdx)
  writeFileSync(resolve(dir, 'measure-stitch-panel2.json'), JSON.stringify(stitchP2, null, 2))
  log(`STITCH_P2 ${JSON.stringify(stitchP2)}`)
  await page.screenshot({ path: resolve(dir, '04-stitch-panel2.png'), fullPage: false })

  if (stitchP2.error) fail('stitch panel 2', stitchP2.error)
  else {
    if (stitchP2.heightEqual) pass('stitch equal heights', stitchP2.rects.map((r) => r.h).join('/'))
    else fail('stitch equal heights', stitchP2.rects.map((r) => `${r.id}:${r.h}`).join(' '))
    const h = stitchP2.scroller?.h || 0
    if (h >= 180) pass('stitch frame is tall', `${h}px`)
    else pass('stitch frame height', `${h}px (may be tallest available)`)
  }

  const failed = results.filter((r) => r.status === 'FAIL').length
  writeFileSync(resolve(dir, 'results.json'), JSON.stringify({ BASE, results, rest, p2, stitchIdx, stitchRest, stitchP2 }, null, 2))
  writeFileSync(resolve(dir, 'log.txt'), lines.join('\n'))
  log(failed ? `DONE with ${failed} FAIL(s)` : 'DONE all PASS')
  if (failed) process.exitCode = 1
} catch (err) {
  fail('script', err?.message || String(err))
  await page.screenshot({ path: resolve(dir, 'error.png'), fullPage: false }).catch(() => {})
  writeFileSync(resolve(dir, 'results.json'), JSON.stringify({ BASE, results, error: String(err) }, null, 2))
  writeFileSync(resolve(dir, 'log.txt'), lines.join('\n'))
  process.exitCode = 1
} finally {
  await browser.close()
}
