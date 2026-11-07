export function firstNameFromDisplayName(displayName: string | null | undefined): string {
  const raw = (displayName || '').trim()
  if (!raw) return 'there'
  const token = raw.split(/\s+/)[0]?.replace(/[^\p{L}\p{N}'-]/gu, '') || ''
  if (!token) return 'there'
  return token.charAt(0).toUpperCase() + token.slice(1)
}
