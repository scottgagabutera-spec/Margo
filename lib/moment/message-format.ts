/** Parse a DM body sent by ComposeSendTo / Stage Send. */
export interface ParsedMomentMessage {
  lyric: string
  songTitle: string
  artistName: string
  postId: string
  sharePath: string
}

const MOMENT_URL_RE =
  /https?:\/\/(?:www\.)?(?:trymargo\.com|[\w.-]+\.vercel\.app)\/m\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i

export function parseMomentMessageBody(body: string): ParsedMomentMessage | null {
  const urlMatch = body.match(MOMENT_URL_RE)
  if (!urlMatch) return null

  const postId = urlMatch[1]
  const withoutUrl = body.replace(urlMatch[0], '').trim()
  const lines = withoutUrl.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return null

  const lyric = lines[0].replace(/^["“]|["”]$/g, '')
  let songTitle = ''
  let artistName = ''

  if (lines[1]) {
    const metaParts = lines[1].split('·').map((p) => p.trim()).filter(Boolean)
    if (metaParts.length >= 2) {
      songTitle = metaParts[0]
      artistName = metaParts[1]
    } else if (metaParts.length === 1) {
      songTitle = metaParts[0]
    }
  }

  return {
    lyric,
    songTitle,
    artistName,
    postId,
    sharePath: `/m/${postId}`,
  }
}

/** Inbox preview — lyric first, never the raw UUID URL. */
export function formatMessagePreview(body: string, maxLen = 72): string {
  const moment = parseMomentMessageBody(body)
  if (moment) {
    const quoted = `"${moment.lyric}"`
    if (quoted.length <= maxLen) return quoted
    return quoted.slice(0, maxLen - 1).trimEnd() + '…'
  }
  const first = body.split('\n')[0]?.trim() || body
  if (first.length <= maxLen) return first
  return first.slice(0, maxLen - 1).trimEnd() + '…'
}
