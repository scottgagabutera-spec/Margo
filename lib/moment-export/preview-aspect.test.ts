import assert from 'node:assert/strict'
import test from 'node:test'

test('export shape ratios match canonical labels', () => {
  const shapes = [
    { id: 'square', w: 1080, h: 1080 },
    { id: 'vertical', w: 1080, h: 1920 },
  ]
  for (const s of shapes) {
    const ratio = s.w / s.h
    if (s.id === 'square') assert.ok(Math.abs(ratio - 1) < 0.001)
    if (s.id === 'vertical') assert.ok(Math.abs(ratio - (9 / 16)) < 0.001)
  }
})
