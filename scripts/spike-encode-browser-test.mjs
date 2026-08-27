/**
 * Headless Chrome test for Moment video spike.
 */
import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const OUT_DIR = '/opt/cursor/artifacts/spike'

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/local/bin/google-chrome',
  })

  const page = await browser.newPage()
  page.on('console', (msg) => console.log('BROWSER:', msg.type(), msg.text()))
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message))

  await page.setViewport({ width: 1280, height: 900 })
  const url = 'http://localhost:3000/dev/moment-video-spike'
  console.log('Loading', url)
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 120_000 })

  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')]
    const btn = buttons.find((b) => b.textContent?.includes('Generate MP4'))
    if (!btn) throw new Error('Generate MP4 button not found')
    if (btn.disabled) throw new Error('Generate MP4 button disabled')
    btn.click()
  })

  const t0 = Date.now()
  let done = false
  while (!done && Date.now() - t0 < 300_000) {
    await new Promise((r) => setTimeout(r, 2000))
    const state = await page.evaluate(() => ({
      text: document.body.innerText.slice(0, 2000),
      hasResult: document.body.innerText.includes('fileSizeBytes'),
      hasVideo: !!document.querySelector('video')?.src,
      error: [...document.querySelectorAll('p')].map((p) => p.textContent).find((t) => t && t.length > 5 && /fail|error/i.test(t)) ?? null,
    }))
    console.log('Progress:', Math.round((Date.now() - t0) / 1000) + 's', state.error || state.text.split('\n').find((l) => l.includes('frame') || l.includes('Mux') || l.includes('Done')) || '...')
    if (state.hasResult || state.error) {
      done = true
      console.log('Final state:', JSON.stringify(state, null, 2))
    }
  }

  const resultPre = await page.$$eval('pre', (nodes) => {
    for (const n of nodes) {
      if (n.textContent?.includes('fileSizeBytes')) return n.textContent
    }
    return null
  })
  console.log('Result:', resultPre)

  const videoSrc = await page.$eval('video', (v) => v.src).catch(() => null)
  if (videoSrc?.startsWith('blob:')) {
    const b64 = await page.evaluate(async () => {
      const video = document.querySelector('video')
      if (!video?.src) return null
      const res = await fetch(video.src)
      const buf = await res.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ''
      const chunk = 0x8000
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
      }
      return btoa(binary)
    })
    if (b64) {
      const outPath = path.join(OUT_DIR, 'MARGO_Moment_Spike.mp4')
      fs.writeFileSync(outPath, Buffer.from(b64, 'base64'))
      console.log('Saved', outPath, fs.statSync(outPath).size, 'bytes')
    }
  }

  await page.screenshot({ path: path.join(OUT_DIR, 'spike-page.png'), fullPage: true })
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
