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
  const paragraphs = splitIntentionalParagraphs(text)
  const displayLines: string[] = []

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i]
    if (paragraph === '') {
      displayLines.push('')
      continue
    }
    displayLines.push(...wrapParagraph(paragraph, maxWidth, measure, font))
  }

  return displayLines.length > 0 ? displayLines : ['']
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
