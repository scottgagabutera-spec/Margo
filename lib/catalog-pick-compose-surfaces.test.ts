import assert from 'node:assert/strict'
import fs from 'node:fs'
import { describe, it } from 'node:test'

describe('catalog pick-only on compose surfaces', () => {
  it('compose page uses shared CatalogPickLyricField and picker back keeps line', () => {
    const page = fs.readFileSync('app/compose/page.tsx', 'utf8')
    const field = fs.readFileSync('components/catalog-pick-lyric-field.tsx', 'utf8')
    assert.match(page, /CatalogPickLyricField/)
    assert.match(page, /catalogLinePickOnly/)
    assert.match(page, /openCatalogLinePicker/)
    assert.match(page, /if \(lyric\.trim\(\)\) \{\s*setLinePickComplete\(true\)/)
    assert.doesNotMatch(page, /onChange=\{\(e\) => setLyric\(e\.target\.value/)
    assert.match(field, /readOnly=\{catalogPickOnly\}/)
    assert.match(field, /onOpenPicker/)
    assert.match(field, /minHeight: 'var\(--margo-touch-min\)'/)
  })

  it('landing stage composer blocks margo free-type and picker back keeps line', () => {
    const stage = fs.readFileSync('components/stage/stage-landing.tsx', 'utf8')
    assert.match(stage, /selectedSong\.source !== 'margo'/)
    assert.match(stage, /if \(lyric\.trim\(\)\) setLinePickComplete\(true\)/)
    assert.doesNotMatch(stage, /linePickComplete && margoLines\.length === 0/)
  })

  it('signature edit uses catalog pick field and controlled line picker', () => {
    const edit = fs.readFileSync('app/profile/edit/page.tsx', 'utf8')
    const picker = fs.readFileSync('components/signature-song-picker.tsx', 'utf8')
    assert.match(edit, /CatalogPickLyricField/)
    assert.match(edit, /catalogPickOnly=\{!!catalogSongId\}/)
    assert.match(edit, /signatureLinePickerOpen/)
    assert.match(picker, /onLinePickerOpenChange/)
    assert.match(picker, /if \(\(currentLyric \|\| ''\)\.trim\(\)\) onLinePickerOpenChange/)
    assert.match(picker, /catalogSongId && pickerOpen/)
  })
})
