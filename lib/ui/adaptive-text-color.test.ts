import assert from 'node:assert/strict'
import test from 'node:test'
import {
  adaptiveTextColorOnBackground,
  contrastRatio,
  ADAPTIVE_TEXT_GOLD,
} from './adaptive-text-color'

test('contrastRatio orders light and dark sensibly', () => {
  assert.ok(contrastRatio('#F4F1ED', '#07060A') >= 12)
  assert.ok(contrastRatio('#07060A', '#E8C547') >= 4.5)
})

test('never picks gold on gold background', () => {
  assert.equal(adaptiveTextColorOnBackground(ADAPTIVE_TEXT_GOLD), 'ink')
})

test('dark dusk bg prefers cream', () => {
  assert.equal(adaptiveTextColorOnBackground('#2A2438'), 'cream')
})

test('light gold theme prefers ink', () => {
  const choice = adaptiveTextColorOnBackground('#E8C547')
  assert.equal(choice, 'ink')
})
