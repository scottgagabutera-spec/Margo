import type { ReactNode } from 'react'

/**
 * Split text into spans, highlighting every case-insensitive match of query in gold.
 */
export function highlightSearchText(text: string, query: string): ReactNode {
  const q = query.trim()
  if (!q || !text) return text

  const lowerText = text.toLowerCase()
  const lowerQ = q.toLowerCase()
  const parts: ReactNode[] = []
  let cursor = 0
  let key = 0

  while (cursor < text.length) {
    const idx = lowerText.indexOf(lowerQ, cursor)
    if (idx === -1) {
      parts.push(text.slice(cursor))
      break
    }
    if (idx > cursor) {
      parts.push(text.slice(cursor, idx))
    }
    parts.push(
      <mark
        key={key++}
        style={{
          background: 'var(--gold-faint)',
          color: 'var(--gold)',
          borderRadius: '2px',
          padding: '0 1px',
        }}
      >
        {text.slice(idx, idx + q.length)}
      </mark>,
    )
    cursor = idx + q.length
  }

  return parts.length === 1 ? parts[0] : parts
}
