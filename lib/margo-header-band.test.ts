import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveMargoHeaderBandElement } from './margo-header-band.ts'

test('resolve header prefers landing nav when present', () => {
  const doc = {
    querySelector(sel: string) {
      if (sel === '.margo-landing-nav') {
        return {
          offsetHeight: 68,
          closest: () => null,
          getBoundingClientRect: () => ({ bottom: 68 }),
        }
      }
      if (sel === '.margo-nav-bar') return { offsetHeight: 56, getBoundingClientRect: () => ({ bottom: 56 }) }
      return null
    },
  } as unknown as Document
  const { source } = resolveMargoHeaderBandElement(doc)
  assert.equal(source, '.margo-landing-nav')
})
