import assert from 'node:assert/strict'
import test from 'node:test'
import {
  writePageResume,
  readPageResume,
  clearPageResume,
  clearAllPageResumes,
  MARGO_PAGE_RESUME_KEY,
} from './margo-page-resume.ts'

test('page resume round-trips in sessionStorage', () => {
  const store = new Map<string, string>()
  const g = globalThis as typeof globalThis & {
    sessionStorage?: Storage
  }
  g.sessionStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => { store.set(k, v) },
    removeItem: (k) => { store.delete(k) },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  }
  clearAllPageResumes()
  writePageResume('/discover/songs', { y: 420, n: 40 })
  const row = readPageResume('/discover/songs')
  assert.equal(row?.y, 420)
  assert.equal(row?.n, 40)
  clearPageResume('/discover/songs')
  assert.equal(readPageResume('/discover/songs'), null)
  assert.ok(store.has(MARGO_PAGE_RESUME_KEY) || store.size === 0)
})
