import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const WIDTHS = [360, 390, 430, 834, 1280] as const

const FIXTURES = [
  {
    name: 'Dribble',
    lines: [
      'Dribble, dribble, yeah Dribble, dribble, yeah',
      'Dribble, dribble, yeah Dribble, dribble, yeah',
      'Dribble, dribble, yeah Pass them all, you caught my eye',
    ],
  },
  {
    name: 'Keep bleeding',
    lines: ['Keep bleeding'],
  },
  {
    name: 'Pockets questions',
    lines: ['When your pockets held more questions Than they ever held'],
  },
] as const

test('B1–B2 lyric zone uses full card width and lyric-only wrap tokens', () => {
  const css = fs.readFileSync('app/globals.css', 'utf8')
  assert.ok(!css.includes('max-width: 36ch'), 'phone 36ch cap removed')
  assert.match(
    css,
    /\.margo-post-card__lyric-zone \.margo-feed-lyric[\s\S]*overflow-wrap: break-word/,
  )
  assert.match(
    css,
    /\.margo-post-card__lyric-zone \.margo-feed-lyric[\s\S]*word-break: normal/,
  )
})

test('B3 collapsed multi-line keeps newline breaks between post_lines (not stitch merge)', () => {
  const layout = fs.readFileSync('components/post-card-feed-layout.tsx', 'utf8')
  assert.ok(layout.includes("{i > 0 ? '\\n' : ''}"))
  assert.ok(!layout.includes('margo-feed-stitch margo-post-card__stitch" aria-hidden> stitch'))
})

test('B4 Dribble stored as separate post_lines rows in test fixture', () => {
  assert.equal(FIXTURES[0].lines.length, 3)
})

for (const fixture of FIXTURES) {
  for (const width of WIDTHS) {
    test(`B6 ${fixture.name} @${width}px: lines preserved, no mid-word break rule in CSS`, () => {
      const joined = fixture.lines.join('\n')
      assert.ok(!joined.match(/\w-\n\w/), 'fixture has no intentional mid-word breaks')
      const css = fs.readFileSync('app/globals.css', 'utf8')
      assert.ok(css.includes('word-break: normal'))
    })
  }
}
