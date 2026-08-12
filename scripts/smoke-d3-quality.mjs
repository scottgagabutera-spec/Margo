/**
 * Cross-engine smoke for D3 quality pass.
 * WebKit ≈ Safari engine; Chrome channel ≈ Chrome Android.
 * Not a substitute for real iOS Safari on device — note that in the PR report.
 *
 * Usage: BASE=http://localhost:3000 node scripts/smoke-d3-quality.mjs
 */
import { chromium, webkit } from 'playwright'
import { mkdirSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const BASE = process.env.BASE || 'http://localhost:3000'
const outDir = resolve(process.cwd(), 'scripts/_smoke-artifacts')
mkdirSync(outDir, { recursive: true })

const findings = []
const log = (msg) => {
  console.log(msg)
  findings.push(msg)
}

async function probeLanding(page, label) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(2500)

  const data = await page.evaluate(() => {
    const tab = document.querySelector('.margo-mobile-tabbar')
    const nav = document.querySelector('.margo-nav-bar')
    const footer = document.querySelector('footer')
    const social = footer ? footer.querySelectorAll('a[aria-label]').length : 0
    const chrome = document.documentElement.getAttribute('data-margo-chrome')
    const tabH = getComputedStyle(document.documentElement).getPropertyValue('--margo-tabbar-h').trim()
    return {
      chrome,
      tabPresent: !!tab,
      tabDisplay: tab ? getComputedStyle(tab).display : null,
      appNavPresent: !!nav,
      tabH,
      footerSocial: social,
    }
  })
  log(`[${label}] landing chrome=${data.chrome} tabPresent=${data.tabPresent} tabDisplay=${data.tabDisplay} appNav=${data.appNavPresent} tabH=${data.tabH} social=${data.footerSocial}`)
  await page.screenshot({ path: resolve(outDir, `d3-landing-${label}.png`), fullPage: true })
  return data
}

async function probeSong(page, label) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(BASE + '/discover/songs', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(4000)
  const songHref = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href^="/song/"]')][0]
    return a?.getAttribute('href') || null
  })
  if (!songHref) {
    log(`[${label}] song: no /song/ link on /discover/songs`)
    return null
  }
  await page.goto(BASE + songHref, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(2000)
  const data = await page.evaluate(() => {
    const tab = document.querySelector('.margo-mobile-tabbar')
    const nav = document.querySelector('.margo-nav-bar')
    const back = [...document.querySelectorAll('button')].some(b => (b.getAttribute('aria-label') || '').toLowerCase() === 'back')
    return {
      chrome: document.documentElement.getAttribute('data-margo-chrome'),
      tabPresent: !!tab,
      appNavPresent: !!nav,
      back,
      tabH: getComputedStyle(document.documentElement).getPropertyValue('--margo-tabbar-h').trim(),
    }
  })
  log(`[${label}] song chrome=${data.chrome} tab=${data.tabPresent} nav=${data.appNavPresent} back=${data.back} tabH=${data.tabH}`)
  await page.screenshot({ path: resolve(outDir, `d3-song-${label}.png`) })
  return data
}

async function probeProfile(page, label) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(BASE + '/profile/scott', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(3500)
  const data = await page.evaluate(() => {
    const navH = getComputedStyle(document.documentElement).getPropertyValue('--nav-height').trim()
    const avatarBtn = document.querySelector('button[aria-label*="photo" i]')
    const cover = document.querySelector('main > div > div')
    const coverMargin = cover ? getComputedStyle(cover).marginTop : null
    return { navH, coverMargin, hasAvatarButton: !!avatarBtn }
  })
  log(`[${label}] profile navH=${data.navH} coverMargin=${data.coverMargin} avatarBtn=${data.hasAvatarButton}`)
  if (data.hasAvatarButton) {
    await page.click('button[aria-label*="photo" i]')
    await page.waitForTimeout(400)
    const open = await page.evaluate(() => !!document.querySelector('[role="dialog"][aria-modal="true"]'))
    log(`[${label}] avatar lightbox open=${open}`)
    if (open) await page.keyboard.press('Escape')
  }
  await page.screenshot({ path: resolve(outDir, `d3-profile-${label}.png`) })
}

async function runEngine(engine, name, launchOpts = {}) {
  const browser = await engine.launch({ headless: true, ...launchOpts })
  const page = await browser.newPage()
  try {
    await probeLanding(page, name)
    await probeSong(page, name)
    await probeProfile(page, name)
  } catch (e) {
    log(`[${name}] ERROR ${e.message}`)
  } finally {
    await browser.close()
  }
}

async function main() {
  log(`BASE=${BASE}`)
  await runEngine(webkit, 'webkit-safari-engine')
  try {
    await runEngine(chromium, 'chrome-android-like', { channel: 'chrome' })
  } catch (e) {
    log(`[chrome] channel launch failed: ${e.message}`)
  }
  writeFileSync(resolve(outDir, 'd3-smoke.txt'), findings.join('\n'), 'utf8')
  log('wrote scripts/_smoke-artifacts/d3-smoke.txt')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
