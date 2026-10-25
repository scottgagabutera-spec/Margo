/**
 * One-off: renders components/MargoLogo symbol SVG (mark tier + dash) to PNG.
 * Source paths match MargoLogo.tsx viewBox and geometry — no redraw.
 */
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(__dirname, '../public/margo-email-logo.png')

const svg = `<svg width="192" height="192" viewBox="-4 -4 88 88" xmlns="http://www.w3.org/2000/svg">
  <circle cx="40" cy="40" r="36" fill="#E8C547"/>
  <path d="M17 57 L17 27 L29 45 L40 26 L51 45 L63 27 L63 57" fill="none" stroke="#0B0B0D" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="35" y="60" width="10" height="3.5" rx="1.75" fill="#0B0B0D" opacity=".55"/>
</svg>`

await sharp(Buffer.from(svg)).png().toFile(out)
console.log('Wrote', out, fs.statSync(out).size, 'bytes')
