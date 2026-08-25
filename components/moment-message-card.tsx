'use client'

import Link from 'next/link'
import type { ParsedMomentMessage } from '@/lib/moment/message-format'

const font = 'var(--font-lora), serif'

export function MomentMessageCard({
  moment,
  mine,
}: {
  moment: ParsedMomentMessage
  mine: boolean
}) {
  const ink = mine ? 'var(--bg)' : 'var(--text)'
  const muted = mine ? 'rgba(11,11,11,0.62)' : 'var(--text-secondary)'
  const accent = mine ? 'var(--bg)' : 'var(--gold)'
  const cardBg = mine ? 'rgba(11,11,11,0.12)' : 'rgba(232,197,71,0.08)'
  const cardBorder = mine ? 'rgba(11,11,11,0.18)' : 'rgba(232,197,71,0.22)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div
        style={{
          borderRadius: '12px',
          padding: '12px 14px',
          background: cardBg,
          border: `1px solid ${cardBorder}`,
        }}
      >
        <p
          style={{
            fontFamily: font,
            fontStyle: 'italic',
            fontSize: '0.9rem',
            lineHeight: 1.45,
            margin: 0,
            color: ink,
          }}
        >
          &ldquo;{moment.lyric}&rdquo;
        </p>
        {(moment.songTitle || moment.artistName) && (
          <p style={{ fontFamily: font, fontSize: '0.72rem', margin: '8px 0 0', color: muted }}>
            {moment.songTitle && <strong style={{ color: ink }}>{moment.songTitle}</strong>}
            {moment.songTitle && moment.artistName ? ' · ' : null}
            {moment.artistName}
          </p>
        )}
      </div>
      <Link
        href={moment.sharePath}
        style={{
          alignSelf: mine ? 'flex-end' : 'flex-start',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          minHeight: '32px',
          padding: '0 12px',
          borderRadius: '50px',
          border: `1px solid ${cardBorder}`,
          background: mine ? 'rgba(11,11,11,0.08)' : 'rgba(232,197,71,0.1)',
          color: accent,
          fontFamily: font,
          fontSize: '0.58rem',
          fontWeight: 700,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          textDecoration: 'none',
        }}
      >
        Open Moment
        <span aria-hidden style={{ fontSize: '0.7rem' }}>→</span>
      </Link>
    </div>
  )
}
