'use client'

import {
  isFullQueueItem,
  isSnippetQueueItem,
  moveQueueItem,
  playQueueIndex,
  removeQueueIndex,
  type LyricMomentQueueItem,
} from '@/lib/audio-engine'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

/**
 * Session Up Next list for the expanded mini-player sheet.
 * Shows the full queue with the current row highlighted; upcoming rows
 * support play / reorder / remove (A1–A2).
 */
export function SessionQueueList({
  queue,
  queueIndex,
  accent = 'var(--gold)',
}: {
  queue: LyricMomentQueueItem[]
  queueIndex: number
  accent?: string
}) {
  if (queue.length === 0) {
    return (
      <p
        style={{
          fontFamily: 'var(--font-lora), serif',
          fontStyle: 'italic',
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
          margin: '0 0 8px',
        }}
      >
        Nothing in Up Next yet
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <p
        style={{
          fontFamily: font,
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          margin: '0 0 4px',
        }}
      >
        Up Next · {queue.length}
      </p>
      {queue.map((item, index) => {
        const isCurrent = index === queueIndex
        const kindLabel = isFullQueueItem(item)
          ? 'Full'
          : isSnippetQueueItem(item)
            ? 'Line'
            : ''
        const subtitle = isFullQueueItem(item)
          ? item.artist
          : item.lineText
            ? `“${item.lineText.length > 48 ? `${item.lineText.slice(0, 48)}…` : item.lineText}”`
            : item.artist

        return (
          <div
            key={`${item.songId}-${item.kind ?? 'snippet'}-${item.lineIndex}-${index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 10px',
              borderRadius: '12px',
              border: isCurrent
                ? `1px solid ${accent}55`
                : '1px solid rgba(255,255,255,0.06)',
              background: isCurrent ? `${accent}12` : 'rgba(255,255,255,0.02)',
              minHeight: 'var(--margo-touch-min)',
              boxSizing: 'border-box',
            }}
          >
            <button
              type="button"
              onClick={() => playQueueIndex(index)}
              aria-label={isCurrent ? `Now playing ${item.title}` : `Play ${item.title}`}
              style={{
                flex: 1,
                minWidth: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                padding: 0,
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span
                  style={{
                    fontFamily: font,
                    fontSize: '0.5rem',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: isCurrent ? accent : 'var(--text-muted)',
                    flexShrink: 0,
                  }}
                >
                  {isCurrent ? 'Now' : kindLabel}
                </span>
                <span
                  style={{
                    fontFamily: font,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.title}
                </span>
              </div>
              <p
                style={{
                  fontFamily: font,
                  fontSize: '0.68rem',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {subtitle}
              </p>
            </button>

            {index > queueIndex && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={index <= queueIndex + 1 && index > queueIndex}
                  onClick={() => {
                    if (index <= 0) return
                    // Don't reorder above/into the currently playing slot via up from first upcoming
                    if (index === queueIndex + 1) return
                    moveQueueItem(index, index - 1)
                  }}
                  style={iconBtnStyle(index <= queueIndex + 1)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 14l6-6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={index >= queue.length - 1}
                  onClick={() => {
                    if (index >= queue.length - 1) return
                    moveQueueItem(index, index + 1)
                  }}
                  style={iconBtnStyle(index >= queue.length - 1)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 10l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}

            <button
              type="button"
              aria-label={`Remove ${item.title} from queue`}
              onClick={() => removeQueueIndex(index)}
              style={{
                ...iconBtnStyle(false),
                width: 'var(--margo-touch-min)',
                height: 'var(--margo-touch-min)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}

function iconBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    color: disabled ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.55)',
    cursor: disabled ? 'default' : 'pointer',
    padding: 0,
    boxSizing: 'border-box',
  }
}
