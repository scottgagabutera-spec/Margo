import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('Margo :root defines --success and --destructive for welcome feedback', () => {
  const css = fs.readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
  const margoRoot = css.split('.dark {')[0]
  assert.match(margoRoot, /--success:\s*oklch/)
  assert.match(margoRoot, /--destructive:\s*oklch/)
})
