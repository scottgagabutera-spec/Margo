/**
 * Production Moment video encode test — bundles encoder and runs in headless Chrome.
 * Audio CORS is satisfied via request interception (localhost QA only).
 *
 * Run: npm install -D puppeteer-core esbuild && node scripts/encode-moment-video-browser-test.mjs
 */
import puppeteer from 'puppeteer-core'
import { spawn, execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import http from 'http'

const OUT_DIR = '/tmp/moment-video-artifacts'
const SAMPLE_AUDIO = 'https://audio.trymargo.com/Margo/audio/Formidable.mp3'
const TEST_PORT = 9876
const BUNDLE_PATH = path.join(OUT_DIR, 'moment-video-test-bundle.mjs')
const HTML_PATH = path.join(OUT_DIR, 'moment-video-test.html')

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

function writeTestPage() {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Moment Video Test</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<style>
  @font-face { font-family: 'Geist'; src: local('Geist Sans'), local('system-ui'); }
  :root { --font-geist-sans: Geist; }
  body { margin: 0; background: #07060A; color: #E8C9A0; font-family: Georgia, serif; padding: 24px; }
  button { padding: 12px 20px; border-radius: 999px; border: none; background: #E8C547; color: #0B0B0D; font-weight: 700; cursor: pointer; }
  pre { white-space: pre-wrap; font-size: 12px; margin-top: 16px; }
  video { width: 270px; margin-top: 16px; border-radius: 12px; }
</style></head>
<body>
  <h1>Moment Video Export Test</h1>
  <button id="run">Encode production Moment</button>
  <pre id="out">Ready</pre>
  <video id="v" controls playsinline></video>
  <script type="module">
    import { encodeMargoMomentMp4 } from './moment-video-test-bundle.mjs'

    const SAMPLE_AUDIO = ${JSON.stringify(SAMPLE_AUDIO)}
    const moment = {
      lines: [{
        lyric: "I sent you these words because they say something I can't.",
        songTitle: 'Formidable',
        artistName: 'Stromae',
        artworkUrl: 'https://audio.trymargo.com/Margo/artwork/Formidable.jpg',
        audioUrl: SAMPLE_AUDIO,
        snippetStart: 42,
        snippetEnd: 52,
      }],
      themeId: 'gold',
      shapeId: 'square',
      vibeLabel: 'Tender',
      seedKey: 'production-test',
    }

    document.getElementById('run').onclick = async () => {
      const out = document.getElementById('out')
      const btn = document.getElementById('run')
      btn.disabled = true
      out.textContent = 'Creating your Moment…'
      try {
        const t0 = performance.now()
        const result = await encodeMargoMomentMp4(moment, (p) => {
          if (p.phase === 'frames' && p.frameCount) {
            out.textContent = 'Creating your Moment… ' + Math.round(((p.frame ?? 0) / p.frameCount) * 100) + '%'
          }
        })
        const url = URL.createObjectURL(result.blob)
        document.getElementById('v').src = url
        out.textContent = JSON.stringify({
          fileSizeBytes: result.fileSizeBytes,
          durationSec: result.durationSec,
          frameCount: result.frameCount,
          encodeMs: Math.round(result.encodeMs),
          wallMs: Math.round(performance.now() - t0),
          videoCodec: result.videoCodec,
          audioCodec: result.audioCodec,
        }, null, 2)
        window.__ENCODE_RESULT__ = result
      } catch (e) {
        out.textContent = 'Error: ' + (e?.message || e)
        console.error(e)
      } finally {
        btn.disabled = false
      }
    }
  </script>
</body></html>`
  fs.writeFileSync(HTML_PATH, html, 'utf8')
}

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const file = req.url === '/moment-video-test-bundle.mjs'
        ? BUNDLE_PATH
        : HTML_PATH
      const type = file.endsWith('.mjs') ? 'application/javascript' : 'text/html'
      res.writeHead(200, {
        'Content-Type': type,
        'Access-Control-Allow-Origin': '*',
      })
      res.end(fs.readFileSync(file))
    })
    server.listen(TEST_PORT, () => resolve(server))
  })
}

async function main() {
  console.log('Building encoder bundle…')
  buildBundle()
  writeTestPage()
  const server = await startStaticServer()

  let audioBytes = null
  let artworkBytes = null
  try {
    const [audioRes, artRes] = await Promise.all([
      fetch(SAMPLE_AUDIO),
      fetch('https://audio.trymargo.com/Margo/artwork/Formidable.jpg').catch(() => null),
    ])
    audioBytes = Buffer.from(await audioRes.arrayBuffer())
    if (artRes?.ok) artworkBytes = Buffer.from(await artRes.arrayBuffer())
    console.log('Prefetched audio', audioBytes.length, 'bytes')
  } catch (e) {
    console.warn('Prefetch warning:', e.message)
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/local/bin/google-chrome',
  })
  const page = await browser.newPage()
  page.on('console', (msg) => console.log('BROWSER:', msg.type(), msg.text()))
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message))

  await page.setRequestInterception(true)
  page.on('request', (req) => {
    const url = req.url()
    if (url.includes('audio.trymargo.com')) {
      const body = url.includes('.jpg') ? artworkBytes : audioBytes
      if (body) {
        req.respond({
          status: 200,
          contentType: url.includes('.jpg') ? 'image/jpeg' : 'audio/mpeg',
          body,
          headers: { 'Access-Control-Allow-Origin': '*' },
        })
        return
      }
    }
    req.continue()
  })

  const url = `http://127.0.0.1:${TEST_PORT}/`
  console.log('Loading', url)
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.click('#run')

  const t0 = Date.now()
  let resultText = null
  while (!resultText && Date.now() - t0 < 300_000) {
    await new Promise((r) => setTimeout(r, 1500))
    resultText = await page.evaluate(() => {
      const t = document.getElementById('out')?.textContent || ''
      return t.includes('fileSizeBytes') || t.startsWith('Error:') ? t : null
    })
    if (!resultText) {
      const partial = await page.evaluate(() => document.getElementById('out')?.textContent || '')
      console.log('Progress:', partial)
    }
  }

  console.log('Result:\n', resultText)
  if (resultText?.startsWith('Error:')) {
    await browser.close()
    server.close()
    process.exit(1)
  }

  const b64 = await page.evaluate(async () => {
    const r = window.__ENCODE_RESULT__
    if (!r?.blob) return null
    const buf = await r.blob.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    return btoa(binary)
  })

  if (b64) {
    const outPath = path.join(OUT_DIR, 'MARGO_Moment_Production.mp4')
    fs.writeFileSync(outPath, Buffer.from(b64, 'base64'))
    const stat = fs.statSync(outPath)
    console.log('Saved', outPath, stat.size, 'bytes')
  }

  await page.screenshot({ path: path.join(OUT_DIR, 'moment-video-test.png'), fullPage: true })
  await browser.close()
  server.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
