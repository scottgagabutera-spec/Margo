/** Collect scroll offsets for Lyric Back keyboard regression tests. */
export type ScrollSnapshot = {
  scrollLeft: number
  scrollTop: number
  tag: string
  className: string
}

export function collectScrollAncestors(from: Element | null, stopAt?: Element | null): ScrollSnapshot[] {
  const out: ScrollSnapshot[] = []
  let node: Element | null = from
  while (node && typeof (node as HTMLElement).scrollTop === 'number') {
    if (node.scrollLeft !== 0 || node.scrollTop !== 0 || node === from) {
      out.push({
        scrollLeft: node.scrollLeft,
        scrollTop: node.scrollTop,
        tag: node.tagName,
        className: node.className?.slice?.(0, 80) ?? '',
      })
    }
    if (stopAt && node === stopAt) break
    node = node.parentElement
  }
  return out
}

export function panelBox(from: Element | null): { left: number; top: number; width: number; height: number } | null {
  if (!from || typeof (from as HTMLElement).getBoundingClientRect !== 'function') return null
  const r = from.getBoundingClientRect()
  return {
    left: Math.round(r.left),
    top: Math.round(r.top),
    width: Math.round(r.width),
    height: Math.round(r.height),
  }
}
