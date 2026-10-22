'use client'

import { getVibeTheme, vibeThemeStyleVars } from '@/lib/vibe-theme'

function normalizeEmotion(e: string) {
  if (!e) return ''
  return e.replace(/send.?it/i, 'SENDIT').replace(/let.?out/i, 'LETOUT')
    .replace('SendIt', 'SENDIT').replace('LetOut', 'LETOUT')
    .replace('SEND IT', 'SENDIT').replace('LET OUT', 'LETOUT')
    .toUpperCase()
}

export type LyricBackReplyContextProps = {
  mode: 'root' | 'nested'
  /** @handle without @ prefix optional */
  username: string
  displayName?: string | null
  /** Root: omitted. Nested: the reply being answered. */
  lyric?: string | null
  song?: string | null
  artist?: string | null
  emotion?: string
}

function formatHandle(username: string): string {
  const h = username.replace(/^@/, '').trim()
  return h ? `@${h}` : '@member'
}

export function LyricBackReplyContext({
  mode,
  username,
  displayName,
  lyric,
  song,
  artist,
  emotion = 'chill',
}: LyricBackReplyContextProps) {
  const handle = formatHandle(username)
  const line = displayName?.trim()
    ? `Replying to ${handle}`
    : `Replying to ${handle}`

  if (mode === 'root') {
    return (
      <p className="margo-lb-reply-context margo-lb-reply-context--root">
        {line}
      </p>
    )
  }

  const vibe = getVibeTheme(normalizeEmotion(emotion))
  const vibeVars = vibeThemeStyleVars(vibe)

  return (
    <div className="margo-lb-reply-context margo-lb-reply-context--nested" style={vibeVars}>
      <p className="margo-lb-reply-context__line">{line}</p>
      <div className="margo-lb-reply-context__card">
        <div className="margo-lb-reply-context__accent" aria-hidden />
        <div className="margo-lb-reply-context__body">
          {lyric ? (
            <p className="margo-lb-reply-context__lyric">&ldquo;{lyric}&rdquo;</p>
          ) : null}
          {(song || artist) ? (
            <p className="margo-lb-reply-context__track">
              {song ? <span className="margo-lb-reply-context__song">{song}</span> : null}
              {artist ? <span className="margo-lb-reply-context__artist">{artist}</span> : null}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
