#!/usr/bin/env node
import { readFileSync } from 'node:fs'

const names = ['Alikiba', 'Nyashinski', 'Rider Man', 'Travis Scott']
const base = process.env.DIAGNOSE_BASE_URL || 'http://127.0.0.1:3000'

const nextConfig = readFileSync(new URL('../next.config.mjs', import.meta.url), 'utf8')
const unoptimized = /unoptimized:\s*true/.test(nextConfig)
const remotePatterns = /remotePatterns/.test(nextConfig)

console.log('next.config images unoptimized:', unoptimized)
console.log('next.config remotePatterns present:', remotePatterns)

for (const name of names) {
  const searchUrl = `${base}/api/artists/search?q=${encodeURIComponent(name)}`
  const res = await fetch(searchUrl)
  const status = res.status
  const data = await res.json()
  const artist = data.artists?.[0]
  const img =
    artist?.artworkUrl ||
    artist?.previewArtworkUrl ||
    null
  let imgStatus = 'n/a'
  if (img) {
    try {
      const head = await fetch(img, { method: 'HEAD' })
      imgStatus = String(head.status)
    } catch (e) {
      imgStatus = `err:${e.message}`
    }
  }
  console.log(
    JSON.stringify({
      name,
      searchHttp: status,
      artistId: artist?.id ?? null,
      artworkUrl: img,
      imageHeadHttp: imgStatus,
    }),
  )
}
