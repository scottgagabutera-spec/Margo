/**
 * Side-by-side feed vs Shorts encode — reports file size, bitrate, bppps.
 * Run: npx puppeteer-core (dev) && node scripts/compare-moment-video-formats.mjs
 */
import puppeteer from 'puppeteer-core'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import http from 'http'

const OUT_DIR = '/opt/cursor/artifacts/moment-video-compare'
const SAMPLE_AUDIO = 'https://audio.trymargo.com/Margo/audio/Formidable.mp3'
const TEST_PORT = 9877
const BUNDLE_PATH = path.join(OUT_DIR, 'bundle.mjs')

function buildBundle() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  execSync(
    'npx esbuild lib/moment-export/video/encode-moment-mp4.ts '
    + '--bundle --format=esm --platform=browser --target=es2022 '
    + '--alias:@=./ '
    + '--outfile=' + BUNDLE_PATH,
    { stdio: 'inherit', cwd: process.cwd() },
  )
}

function writePage() {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>@font-face{font-family:'Geist';src:local('Geist Sans')} :root{--font-geist-sans:Geist}</style>
<body><pre id="out">Ready</pre>
<script type="module">
import { encodeMargoMomentMp4 } from './bundle.mjs'
const SAMPLE_AUDIO = ${JSON.stringify(SAMPLE_AUDIO)}
const base = {
  lines: [{
    lyric: "I sent you these words because they say something I can't.",
    songTitle: 'Formidable', artistName: 'Stromae',
    artworkUrl: 'https://audio.trymargo.com/Margo/artwork/Formidable.jpg',
    audioUrl: SAMPLE_AUDIO, snippetStart: 42, snippetEnd: 52,
  }],
  themeId: 'gold', vibeLabel: 'Tender', seedKey: 'compare-test',
}
window.runCompare = async () => {
  const results = {}
  window.__BLOBS__ = {}
  for (const shapeId of ['square', 'vertical']) {
    const result = await encodeMargoMomentMp4({ ...base, shapeId })
    window.__BLOBS__[shapeId] = result.blob
    const pixels = result.width * result.height
    const videoBits = Math.max(0, result.fileSizeBytes * 8 - 128000 * result.durationSec)
    const avgVideoBitrate = videoBits / result.durationSec
    results[shapeId] = {
      width: result.width, height: result.height, pixels,
      fileSizeBytes: result.fileSizeBytes,
      fileSizeMB: +(result.fileSizeBytes / (1024 * 1024)).toFixed(2),
      durationSec: result.durationSec,
      avgVideoBitrateMbps: +(avgVideoBitrate / 1e6).toFixed(2),
      bppps: +(avgVideoBitrate / pixels).toFixed(3),
      encodeMs: Math.round(result.encodeMs),
    }
  }
  return results
}
</script></body></html>`
  fs.writeFileSync(path.join(OUT_DIR, 'page.html'), html)
}

async function blobToBuffer(page, shapeId) {
  const b64 = await page.evaluate(async (shape) => {
    const blob = window.__BLOBS__?.[shape]
    if (!blob) return null
    const buf = await blob.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
    }
    return btoa(binary)
  }, shapeId)
  return b64 ? Buffer.from(b64, 'base64') : null
}

async function main() {
  buildBundle()
  writePage()
  const server = http.createServer((req, res) => {
    const file = req.url?.includes('bundle') ? BUNDLE_PATH : path.join(OUT_DIR, 'page.html')
    res.writeHead(200, { 'Content-Type': file.endsWith('.mjs') ? 'application/javascript' : 'text/html' })
    res.end(fs.readFileSync(file))
  })
  await new Promise((r) => server.listen(TEST_PORT, r))

  const [audioRes, artRes] = await Promise.all([
    fetch(SAMPLE_AUDIO),
    fetch('https://audio.trymargo.com/Margo/artwork/Formidable.jpg'),
  ])
  const audioBytes = Buffer.from(await audioRes.arrayBuffer())
  const artworkBytes = Buffer.from(await artRes.arrayBuffer())

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/local/bin/google-chrome',
  })
  const page = await browser.newPage()
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    const url = req.url()
    if (url.includes('audio.trymargo.com')) {
      req.respond({
        status: 200,
        contentType: url.includes('.jpg') ? 'image/jpeg' : 'audio/mpeg',
        body: url.includes('.jpg') ? artworkBytes : audioBytes,
        headers: { 'Access-Control-Allow-Origin': '*' },
      })
      return
    }
    req.continue()
  })

  await page.goto(`http://127.0.0.1:${TEST_PORT}/`, { waitUntil: 'domcontentloaded' })
  console.log('Encoding feed + Shorts…')
  const results = await page.evaluate(async () => {
    const t0 = Date.now()
    const r = await window.runCompare()
    return { results: r, wallMs: Date.now() - t0 }
  })
  console.log(JSON.stringify(results, null, 2))

  for (const [shapeId, name] of [['square', 'feed'], ['vertical', 'shorts']]) {
    const buf = await blobToBuffer(page, shapeId)
    if (buf) {
      const mp4 = path.join(OUT_DIR, `${name}.mp4`)
      fs.writeFileSync(mp4, buf)
      execSync(`ffmpeg -y -ss 6 -i ${mp4} -frames:v 1 ${path.join(OUT_DIR, `${name}-frame.png`)}`, { stdio: 'ignore' })
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2))

  await browser.close()
  server.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
