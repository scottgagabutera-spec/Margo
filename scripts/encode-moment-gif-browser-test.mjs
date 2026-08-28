/**
 * Production Moment GIF encode test — bundles encoder and runs in headless Chrome.
 * Artwork CORS is satisfied via request interception (localhost QA only).
 *
 * Run: npm install -D puppeteer-core esbuild && node scripts/encode-moment-gif-browser-test.mjs
 */
import puppeteer from 'puppeteer-core'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import http from 'http'

const OUT_DIR = '/tmp/moment-gif-artifacts'
const SAMPLE_AUDIO = 'https://audio.trymargo.com/Margo/audio/Formidable.mp3'
const ARTWORK_URL = 'https://audio.trymargo.com/Margo/artwork/Formidable.jpg'
const TEST_PORT = 9877
const BUNDLE_PATH = path.join(OUT_DIR, 'moment-gif-test-bundle.mjs')
const HTML_PATH = path.join(OUT_DIR, 'moment-gif-test.html')

function buildBundle() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  execSync(
    'npx esbuild lib/moment-export/gif/encode-moment-gif.ts '
    + '--bundle --format=esm --platform=browser --target=es2022 '
    + '--alias:@=./ '
    + '--outfile=' + BUNDLE_PATH,
    { stdio: 'inherit', cwd: process.cwd() },
  )
}

function makeMoment(snippetStart, snippetEnd) {
  return {
    lines: [{
      lyric: "I sent you these words because they say something I can't.",
      songTitle: 'Formidable',
      artistName: 'Stromae',
      artworkUrl: ARTWORK_URL,
      audioUrl: SAMPLE_AUDIO,
      snippetStart,
      snippetEnd,
    }],
    themeId: 'gold',
    shapeId: 'square',
    vibeLabel: 'Tender',
    seedKey: `gif-test-${snippetEnd - snippetStart}s`,
  }
}

function writeTestPage() {
  const cases = [
    { id: 'dur-10s', moment: makeMoment(42, 52) },
    { id: 'dur-18s', moment: makeMoment(42, 60) },
    { id: 'dur-30s', moment: makeMoment(42, 72) },
  ]
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Moment GIF Test</title>
<style>:root { --font-geist-sans: system-ui, sans-serif; }</style></head>
<body>
  <pre id="out">Ready</pre>
  <script type="module">
    import { encodeMargoMomentGif } from './moment-gif-test-bundle.mjs'
    const cases = ${JSON.stringify(cases)}
    window.__runCases__ = async () => {
      const results = []
      for (const c of cases) {
        const t0 = performance.now()
        const result = await encodeMargoMomentGif(c.moment)
        const bytes = new Uint8Array(await result.blob.arrayBuffer())
        results.push({
          id: c.id,
          width: result.width,
          height: result.height,
          fps: result.fps,
          frameCount: result.frameCount,
          durationSec: result.durationSec,
          fileSizeBytes: result.fileSizeBytes,
          encodeMs: Math.round(result.encodeMs),
          wallMs: Math.round(performance.now() - t0),
          mimeType: result.blob.type,
          magic: String.fromCharCode(bytes[0], bytes[1], bytes[2]),
          bytes: Array.from(bytes),
        })
      }
      return results
    }
    window.__ready__ = true
  </script>
</body></html>`
  fs.writeFileSync(HTML_PATH, html, 'utf8')
}

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const file = req.url === '/moment-gif-test-bundle.mjs' ? BUNDLE_PATH : HTML_PATH
      const type = file.endsWith('.mjs') ? 'application/javascript' : 'text/html'
      res.writeHead(200, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' })
      res.end(fs.readFileSync(file))
    })
    server.listen(TEST_PORT, () => resolve(server))
  })
}

async function main() {
  console.log('Building GIF encoder bundle…')
  buildBundle()
  writeTestPage()
  const server = await startStaticServer()

  let artworkBytes = null
  try {
    const artRes = await fetch(ARTWORK_URL)
    artworkBytes = Buffer.from(await artRes.arrayBuffer())
    console.log('Prefetched artwork', artworkBytes.length, 'bytes')
  } catch (e) {
    console.warn('Artwork prefetch warning:', e.message)
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/local/bin/google-chrome',
    protocolTimeout: 600_000,
  })
  const page = await browser.newPage()
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message))

  await page.setRequestInterception(true)
  page.on('request', (req) => {
    if (req.url().includes('Formidable.jpg') && artworkBytes) {
      req.respond({
        status: 200,
        contentType: 'image/jpeg',
        body: artworkBytes,
        headers: { 'Access-Control-Allow-Origin': '*' },
      })
      return
    }
    req.continue()
  })

  await page.goto(`http://127.0.0.1:${TEST_PORT}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForFunction(() => window.__ready__, { timeout: 30_000 })

  console.log('Encoding 10s / 18s / 30s GIF cases…')
  const results = await page.evaluate(async () => window.__runCases__())

  console.log('\n=== GIF ENCODE RESULTS ===')
  console.log('id'.padEnd(12), 'WxH'.padEnd(14), 'fps', 'frames', 'dur', 'KB', 'encodeMs', 'magic', 'mime')
  let allOk = true
  for (const r of results) {
    const fpath = path.join(OUT_DIR, `MARGO_gif_${r.id}.gif`)
    fs.writeFileSync(fpath, Buffer.from(r.bytes))
    delete r.bytes
    r.gifFile = fpath
    r.fileSizeKB = Math.round(r.fileSizeBytes / 1024)
    r.validGif = r.magic === 'GIF' && r.mimeType === 'image/gif'
    r.widthOk = r.width === 720
    r.fpsOk = r.fps === 12
    r.holdOk = r.durationSec === (r.id === 'dur-10s' ? 12 : r.id === 'dur-18s' ? 20 : 32)
    if (!r.validGif || !r.widthOk || !r.fpsOk) allOk = false
    console.log(
      r.id.padEnd(12),
      `${r.width}x${r.height}`.padEnd(14),
      String(r.fps).padEnd(4),
      String(r.frameCount).padEnd(6),
      String(r.durationSec).padEnd(5),
      String(r.fileSizeKB).padEnd(5),
      String(r.encodeMs).padEnd(8),
      r.magic,
      r.mimeType,
    )
  }

  const summaryPath = path.join(OUT_DIR, 'results.json')
  fs.writeFileSync(summaryPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2))
  console.log('\nJSON:', summaryPath)
  console.log('Artifacts:', OUT_DIR)

  await browser.close()
  server.close()
  if (!allOk) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
