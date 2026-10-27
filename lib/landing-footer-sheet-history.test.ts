import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isFooterSheetHistoryState,
  MARGO_FOOTER_SHEET_HISTORY_KEY,
} from './landing-footer-sheet-history.ts'

test('isFooterSheetHistoryState recognizes sheet marker', () => {
  assert.equal(isFooterSheetHistoryState({ [MARGO_FOOTER_SHEET_HISTORY_KEY]: true }), true)
  assert.equal(isFooterSheetHistoryState({}), false)
  assert.equal(isFooterSheetHistoryState(null), false)
})
