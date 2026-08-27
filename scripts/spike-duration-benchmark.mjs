import puppeteer from 'puppeteer'
import fs from 'fs'

async function bench(duration) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: '/usr/local/bin/google-chrome',
  })
  const page = await browser.newPage()
  await page.goto(`http://localhost:3000/dev/moment-video-spike?autorun=1&duration=${duration}`, {
    waitUntil: 'networkidle0',
    timeout: 120_000,
  })
  await page.waitForFunction(
    () => document.body.innerText.includes('fileSizeBytes'),
    { timeout: 120_000 },
  )
  const result = await page.$$eval('pre', (nodes) => {
    for (const n of nodes) {
      if (n.textContent?.includes('fileSizeBytes')) return JSON.parse(n.textContent || '{}')
    }
    return null
  })
  await browser.close()
  return result
}

const all = []
for (const d of [5, 10, 12]) {
  console.log('Benchmark', d + 's...')
  all.push({ requested: d, ...(await bench(d)) })
}
fs.writeFileSync('/opt/cursor/artifacts/spike/duration-benchmark.json', JSON.stringify(all, null, 2))
console.log(JSON.stringify(all, null, 2))
