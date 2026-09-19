import type { TextMeasureFn } from '@/lib/moment-export/layout/types'

/** Normalize line endings without destroying intentional breaks */
export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n')
}

/**
 * Split on intentional user line breaks. Empty segments are preserved so
 * blank lines (e.g. "line1\\n\\nline2") render as visual gaps.
 */
export function splitIntentionalParagraphs(text: string): string[] {
  return normalizeLineEndings(text).split('\n')
}

function breakLongToken(
  token: string,
  maxWidth: number,
  measure: TextMeasureFn,
  font: string,
): string[] {
  if (!token) return []
  if (measure(token, font) <= maxWidth) return [token]
  const chunks: string[] = []
  let chunk = ''
  for (const ch of token) {
    const test = chunk + ch
    if (measure(test, font) > maxWidth && chunk) {
      chunks.push(chunk)
      chunk = ch
    } else {
      chunk = test
    }
  }
  if (chunk) chunks.push(chunk)
  return chunks
}

/** Word-wrap a single paragraph — never flattens \\n (caller splits paragraphs first). */
export function wrapParagraph(
  paragraph: string,
  maxWidth: number,
  measure: TextMeasureFn,
  font: string,
): string[] {
  const trimmed = paragraph.trim()
  if (!trimmed) return ['']

  const words = trimmed.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const segments = breakLongToken(word, maxWidth, measure, font)
    for (const segment of segments) {
      const test = line ? `${line} ${segment}` : segment
      if (measure(test, font) > maxWidth && line) {
        lines.push(line)
        line = segment
      } else {
        line = test
      }
    }
  }
  if (line) lines.push(line)
  return lines.length > 0 ? lines : ['']
}

/**
 * Layout lyric text with intentional \\n preserved as paragraph boundaries.
 * Word wrapping runs within each paragraph only.
 */
export function layoutLyricText(
  text: string,
  maxWidth: number,
  measure: TextMeasureFn,
  font: string,
): string[] {
  return presentLyricText(text, maxWidth, measure, {
    fontStyle: 'italic',
    fontFamily: 'Lora, serif',
    maxFontSize: parseFontSize(font) || 28,
    minFontSize: parseFontSize(font) || 28,
  }).lines.map((line) => line.text)
}

export interface LyricVisualLine {
  text: string
  /** True when this row continues a stanza that could not fit on one line. */
  continuation: boolean
}

export interface LyricPresentation {
  fontSize: number
  lines: LyricVisualLine[]
}

export interface PresentLyricTextOptions {
  fontStyle: string
  fontFamily: string
  maxFontSize: number
  minFontSize: number
}

function parseFontSize(font: string): number | null {
  const match = font.match(/(\d+(?:\.\d+)?)px/)
  if (!match) return null
  const n = Number(match[1])
  return Number.isFinite(n) ? n : null
}

function lyricMeasureFont(style: string, size: number, family: string): string {
  return `${style} ${Math.round(size)}px ${family}`
}

function paragraphFits(
  paragraph: string,
  maxWidth: number,
  measure: TextMeasureFn,
  font: string,
): boolean {
  const trimmed = paragraph.trim()
  if (!trimmed) return true
  return measure(trimmed, font) <= maxWidth
}

/**
 * Prefer a mid-thought split that keeps both rows visually even, instead of
 * a greedy wrap that parks a leftover word on its own row.
 */
export function wrapParagraphBalanced(
  paragraph: string,
  maxWidth: number,
  measure: TextMeasureFn,
  font: string,
): string[] {
  const trimmed = paragraph.trim()
  if (!trimmed) return ['']

  const words = trimmed.split(/\s+/).filter(Boolean)
  const greedy = wrapParagraph(paragraph, maxWidth, measure, font)
  if (greedy.length !== 2 || words.length < 2) return greedy

  let best: string[] | null = null
  let bestScore = Infinity
  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(' ')
    const right = words.slice(i).join(' ')
    const leftW = measure(left, font)
    const rightW = measure(right, font)
    if (leftW > maxWidth || rightW > maxWidth) continue
    const orphan = i === 1 || i === words.length - 1 ? maxWidth * 0.1 : 0
    const score = Math.abs(leftW - rightW) + orphan
    if (score < bestScore) {
      bestScore = score
      best = [left, right]
    }
  }
  return best ?? greedy
}

function tryLyricSize(
  paragraphs: string[],
  maxWidth: number,
  measure: TextMeasureFn,
  font: string,
  allowWrap: boolean,
): LyricVisualLine[] | null {
  const lines: LyricVisualLine[] = []
  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      lines.push({ text: '', continuation: false })
      continue
    }
    if (paragraphFits(paragraph, maxWidth, measure, font)) {
      lines.push({ text: paragraph.trim(), continuation: false })
      continue
    }
    if (!allowWrap) return null
    const wrapped = wrapParagraphBalanced(paragraph, maxWidth, measure, font)
    wrapped.forEach((row, idx) => {
      lines.push({ text: row, continuation: idx > 0 })
    })
  }
  return lines.length > 0 ? lines : [{ text: '', continuation: false }]
}

/**
 * Fit lyric type so each selected line stays on one row when possible.
 * Wrapping is a last resort at minFontSize, and uses a balanced split.
 */
export function presentLyricText(
  text: string,
  maxWidth: number,
  measure: TextMeasureFn,
  opts: PresentLyricTextOptions,
): LyricPresentation {
  const paragraphs = splitIntentionalParagraphs(text)
  const maxSize = Math.max(1, Math.round(opts.maxFontSize))
  const minSize = Math.max(1, Math.min(maxSize, Math.round(opts.minFontSize)))

  let lo = minSize
  let hi = maxSize
  let best = 0
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    const font = lyricMeasureFont(opts.fontStyle, mid, opts.fontFamily)
    if (tryLyricSize(paragraphs, maxWidth, measure, font, false)) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  if (best > 0) {
    const font = lyricMeasureFont(opts.fontStyle, best, opts.fontFamily)
    return { fontSize: best, lines: tryLyricSize(paragraphs, maxWidth, measure, font, false)! }
  }

  const font = lyricMeasureFont(opts.fontStyle, minSize, opts.fontFamily)
  return { fontSize: minSize, lines: tryLyricSize(paragraphs, maxWidth, measure, font, true)! }
}

export function truncateToWidth(
  text: string,
  maxWidth: number,
  measure: TextMeasureFn,
  font: string,
): string {
  const t = (text || '').trim()
  if (!t) return ''
  if (measure(t, font) <= maxWidth) return t

  let lo = 0
  let hi = t.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    const candidate = `${t.slice(0, mid).trimEnd()}…`
    if (measure(candidate, font) <= maxWidth) lo = mid
    else hi = mid - 1
  }
  return lo <= 0 ? '…' : `${t.slice(0, lo).trimEnd()}…`
}
