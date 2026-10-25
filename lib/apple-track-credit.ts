/**
 * iTunes Search returns primary artistName + trackName that often includes
 * "(feat. …)". Split so feed/compose show title + full credit separately.
 */
export function parseAppleTrackCredit(
  trackName: string,
  artistName: string,
): { title: string; artist: string } {
  const rawTitle = (trackName || '').trim()
  const primary = (artistName || 'Unknown Artist').trim()
  if (!rawTitle) return { title: '', artist: primary }

  const parenFeat = rawTitle.match(/^(.+?)\s*\(\s*(feat\.?|ft\.?|featuring)\s+([^)]+)\)\s*$/i)
  if (parenFeat) {
    const base = parenFeat[1].trim()
    const featNames = parenFeat[3].trim()
    return {
      title: base,
      artist: `${primary} feat. ${featNames}`,
    }
  }

  const dashFeat = rawTitle.match(/^(.+?)\s[-–—]\s*(feat\.?|ft\.?|featuring)\s+(.+)$/i)
  if (dashFeat) {
    return {
      title: dashFeat[1].trim(),
      artist: `${primary} feat. ${dashFeat[3].trim()}`,
    }
  }

  return { title: rawTitle, artist: primary }
}
