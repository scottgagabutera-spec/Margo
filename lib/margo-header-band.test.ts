import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveMargoHeaderBandElement } from './margo-header-band.ts'

test('prefers landing nav when visible', () => {
  const doc = {
    querySelector(sel: string) {
      if (sel === '.margo-landing-nav') {
        return { offsetHeight: 68, closest: () => null, getBoundingClientRect: () => ({ bottom: 68, height: 68 }) }
      }
      return null
    },
  } as unknown as Document
  assert.equal(resolveMargoHeaderBandElement(doc).source, '.margo-landing-nav')
})
