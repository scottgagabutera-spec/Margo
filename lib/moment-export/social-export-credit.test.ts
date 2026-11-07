import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveSocialExportLayout } from './layout/social-export-layout.ts'
import { CREDIT_PLATE_FILL_SOLID } from './layout/credit-plate.ts'
import { contrastRatio } from '../ui/adaptive-text-color.ts'
import { STAGE_CARD_THEMES } from '../moment/stage-theme.ts'

const measure = (text: string) => text.length * 7

const baseInput = {
  lyric: 'Hold the line',
  songTitle: 'Golden Hour',
  artistName: 'Trymargo',
  artworkUrl: 'https://example.com/art.jpg',
  outputWidthPx: 1080,
}

test('square and story credit plate includes art, title, and artist', () => {
  for (const variant of ['square', 'shorts'] as const) {
    const layout = resolveSocialExportLayout(
      {
        ...baseInput,
        layoutVariant: variant,
        outputHeightPx: variant === 'shorts' ? Math.round(1080 * (16 / 9)) : 1080,
      },
      measure,
    )
    assert.ok(layout.creditPlate, variant)
    assert.ok(layout.artwork, variant)
    assert.ok(layout.meta?.song?.text, variant)
    assert.ok(layout.meta?.artist?.text, variant)
    assert.ok(contrastRatio(layout.meta!.song!.style.color, CREDIT_PLATE_FILL_SOLID) >= 4.5, variant)
    assert.ok(contrastRatio(layout.meta!.artist!.style.color, CREDIT_PLATE_FILL_SOLID) >= 4.5, variant)
    assert.ok(contrastRatio(layout.lyric.style.color, layout.background.base) >= 4.5, variant)
  }
})

test('gold theme uses dark lyric ink', () => {
  const layout = resolveSocialExportLayout(
    { ...baseInput, themeId: 'gold', layoutVariant: 'square', outputHeightPx: 1080 },
    measure,
  )
  assert.equal(layout.background.base, STAGE_CARD_THEMES[0].bg)
  assert.equal(layout.lyric.style.color, '#07060A')
})
