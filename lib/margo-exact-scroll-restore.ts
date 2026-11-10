/**
 * Apply scroll Y only when the document (or element) is tall enough — bounded, no polling loop.
 */
export function restoreExactElementScroll(
  el: HTMLElement,
  y: number,
  opts?: { maxFrames?: number },
) {
  const max = opts?.maxFrames ?? 10
  let frame = 0
  const apply = () => {
    const maxScroll = el.scrollHeight - el.clientHeight
    if (maxScroll + 2 >= y || frame >= max) {
      el.scrollTop = y
      return
    }
    frame += 1
    requestAnimationFrame(apply)
  }
  el.scrollTop = y
  requestAnimationFrame(apply)
}

export function restoreExactWindowScroll(y: number, opts?: { maxFrames?: number }) {
  if (typeof window === 'undefined') return
  const max = opts?.maxFrames ?? 12
  let frame = 0
  const doc = document.documentElement
  const apply = () => {
    const maxScroll = Math.max(0, doc.scrollHeight - window.innerHeight)
    if (maxScroll + 2 >= y || frame >= max) {
      window.scrollTo({ top: y, behavior: 'auto' })
      return
    }
    frame += 1
    requestAnimationFrame(apply)
  }
  window.scrollTo({ top: y, behavior: 'auto' })
  requestAnimationFrame(apply)
}
