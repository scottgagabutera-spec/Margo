/** Which element draws the top translucent / fixed header band. */
export type MargoHeaderBandSource =
  | '.margo-landing-nav'
  | '.margo-nav-bar'
  | 'fallback'

export function resolveMargoHeaderBandElement(doc: Document = document): {
  el: HTMLElement | null
  source: MargoHeaderBandSource
} {
  const landing = doc.querySelector('.margo-landing-nav') as HTMLElement | null
  if (landing && landing.offsetHeight > 0) {
    const hidden = landing.closest('[hidden]') != null
    if (!hidden) return { el: landing, source: '.margo-landing-nav' }
  }
  const appNav = doc.querySelector('.margo-nav-bar') as HTMLElement | null
  if (appNav && appNav.offsetHeight > 0) {
    return { el: appNav, source: '.margo-nav-bar' }
  }
  return { el: appNav ?? landing, source: 'fallback' }
}

export function measureMargoHeaderBottom(doc: Document = document): {
  bottom: number
  height: number
  source: MargoHeaderBandSource
} {
  const { el, source } = resolveMargoHeaderBandElement(doc)
  if (!el) {
    return { bottom: 72, height: 72, source: 'fallback' }
  }
  const rect = el.getBoundingClientRect()
  return { bottom: rect.bottom, height: rect.height, source }
}
