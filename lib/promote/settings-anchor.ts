/** Settings page anchor — OAuth returns here so users land on Connected Accounts. */
export const MARGO_AUTO_PROMOTE_SETTINGS_HASH = 'margo-auto-promote'

export const MARGO_AUTO_PROMOTE_SETTINGS_PATH = `/settings#${MARGO_AUTO_PROMOTE_SETTINGS_HASH}`

export function scrollToAutoPromoteSettings(behavior: ScrollBehavior = 'smooth'): void {
  if (typeof document === 'undefined') return
  const el = document.getElementById(MARGO_AUTO_PROMOTE_SETTINGS_HASH)
  el?.scrollIntoView({ block: 'start', behavior })
}
