export function echoSongPickKey(song: {
  songId: string | null
  songTitle: string
  artistName: string
}): string {
  return song.songId || `${song.songTitle}\0${song.artistName}`
}

export function echoHitPickKey(hit: {
  source: string
  margoSongId?: string | null
  title: string
  artist: string
}): string {
  if (hit.source === 'margo' && hit.margoSongId) return hit.margoSongId
  return `${hit.title}\0${hit.artist}`
}
