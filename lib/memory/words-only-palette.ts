const PALETTES = [
  'linear-gradient(155deg, #2a2438 0%, #12101a 55%, rgba(232, 197, 71, 0.08) 100%)',
  'linear-gradient(155deg, #1a2838 0%, #0d1218 55%, rgba(168, 196, 174, 0.1) 100%)',
  'linear-gradient(155deg, #2e1f2a 0%, #120c10 55%, rgba(232, 168, 176, 0.08) 100%)',
  'linear-gradient(155deg, #1f2e28 0%, #0c1210 55%, rgba(168, 196, 174, 0.12) 100%)',
]

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function memoryWordsOnlyBackground(memoryId: string): string {
  return PALETTES[hashId(memoryId) % PALETTES.length]
}

/** Representative flat color for contrast sampling on words-only tiles. */
export function memoryWordsOnlySampleColor(memoryId: string): string {
  const idx = hashId(memoryId) % PALETTES.length
  const flats = ['#2a2438', '#1a2838', '#2e1f2a', '#1f2e28']
  return flats[idx]
}
