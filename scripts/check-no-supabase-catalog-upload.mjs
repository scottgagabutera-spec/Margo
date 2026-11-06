/**
 * Fail CI if song-audio / song-artwork Supabase Storage uploads reappear in app code.
 * Allowed: purge, delete-account, migrations, this script.
 */
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const skipDir = new Set(['node_modules', '.git', '.next', 'dist', 'out'])

const allowFiles = new Set([
  path.join(root, 'lib/purge-user-account.ts'),
  path.join(root, 'app/api/delete-account/route.ts'),
])

const pattern = /\.from\(\s*['"](song-audio|song-artwork)['"]\s*\)/

function walk(dir, bad) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const ent of entries) {
    if (skipDir.has(ent.name)) continue
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      walk(p, bad)
      continue
    }
    if (!/\.(tsx|ts|jsx|js)$/.test(ent.name)) continue
    if (allowFiles.has(p)) continue
    if (p.includes(`${path.sep}supabase${path.sep}migrations${path.sep}`)) continue
    if (ent.name === 'check-no-supabase-catalog-upload.mjs') continue
    const c = fs.readFileSync(p, 'utf8')
    if (pattern.test(c)) bad.push(p)
  }
}

const bad = []
walk(path.join(root, 'components'), bad)
walk(path.join(root, 'app'), bad)
walk(path.join(root, 'lib'), bad)
walk(path.join(root, 'hooks'), bad)

if (bad.length > 0) {
  console.error('Disallowed Supabase Storage reference (song-audio / song-artwork):')
  for (const p of bad) console.error('  ', p)
  process.exit(1)
}
console.log('ok: no song-audio / song-artwork uploads in app paths')
