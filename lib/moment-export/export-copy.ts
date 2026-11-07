export function shouldShowExportArtist(name: string): boolean {
  const n = (name || '').trim().toLowerCase()
  if (!n) return false
  return n !== 'margo' && n !== 'trymargo'
}

export function sentenceCaseLabel(text: string): string {
  const t = (text || '').trim()
  if (!t) return ''
  const lower = t.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}
