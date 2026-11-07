export function shouldShowExportArtist(name: string): boolean {
  return !!(name || '').trim()
}

export function sentenceCaseLabel(text: string): string {
  const t = (text || '').trim()
  if (!t) return ''
  const lower = t.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}
