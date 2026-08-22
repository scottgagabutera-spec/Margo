/**
 * Canonical searchable text for a Moment Meilisearch document.
 * Shared by lib/meilisearch/documents.ts and scripts/meilisearch-backfill.mjs
 * so full backfill and incremental sync never diverge on multi-line indexing.
 *
 * @param {string|null|undefined} mirrorText posts.text (position-0 mirror)
 * @param {{ position?: number|null, text?: string|null }[]|null|undefined} postLines
 * @returns {string}
 */
export function buildMomentSearchText(mirrorText, postLines) {
  const mirror = (mirrorText || '').trim()
  const lineTexts =
    Array.isArray(postLines) && postLines.length > 0
      ? [...postLines]
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((l) => (l.text || '').trim())
          .filter(Boolean)
      : []
  return lineTexts.length > 0 ? lineTexts.join(' / ') : mirror
}

/** @returns {void} */
export function runMomentSearchTextSelfTest() {
  const cases = [
    {
      name: 'single-line mirror only (no post_lines)',
      mirror: 'Only line',
      lines: null,
      want: 'Only line',
    },
    {
      name: 'multi-line ordered by position',
      mirror: 'line one',
      lines: [
        { position: 2, text: 'line three' },
        { position: 0, text: 'line one' },
        { position: 1, text: 'line two' },
      ],
      want: 'line one / line two / line three',
    },
    {
      name: 'phrase only in line 2',
      mirror: 'first',
      lines: [
        { position: 0, text: 'first' },
        { position: 1, text: 'unique-phrase-here' },
      ],
      want: 'first / unique-phrase-here',
    },
    {
      name: 'empty post_lines falls back to mirror',
      mirror: 'mirror wins',
      lines: [],
      want: 'mirror wins',
    },
    {
      name: 'blank mirror with post_lines',
      mirror: '',
      lines: [{ position: 0, text: 'from lines' }],
      want: 'from lines',
    },
  ]

  for (const c of cases) {
    const got = buildMomentSearchText(c.mirror, c.lines)
    if (got !== c.want) {
      throw new Error(`${c.name}: expected "${c.want}", got "${got}"`)
    }
  }
}

const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].endsWith('moment-search-text.mjs')

if (isMain) {
  runMomentSearchTextSelfTest()
  console.log('moment-search-text self-test passed')
}
