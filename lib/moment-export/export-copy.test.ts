import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldShowExportArtist } from './export-copy.ts'

test('shows export artist when known, including Margo credits', () => {
  assert.equal(shouldShowExportArtist('Margo'), true)
  assert.equal(shouldShowExportArtist('Trymargo'), true)
  assert.equal(shouldShowExportArtist('  '), false)
  assert.equal(shouldShowExportArtist('Nova'), true)
})
