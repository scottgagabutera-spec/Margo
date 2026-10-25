/** Official Margo account usernames (feed portrait fallback uses brand mark). */
export function isMargoBrandUsername(username: string | null | undefined): boolean {
  const u = (username ?? '').replace(/^@/, '').trim().toLowerCase()
  return u === 'margo' || u === 'trymargo'
}
