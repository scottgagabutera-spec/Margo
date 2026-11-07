const SHINE_MS = 1500

export function highlightNewItems(selector: string, limit = 3) {
  if (typeof document === 'undefined') return
  const nodes = Array.from(document.querySelectorAll(selector)).slice(0, limit)
  nodes.forEach((el) => {
    el.classList.add('margo-live-new-shine')
    window.setTimeout(() => el.classList.remove('margo-live-new-shine'), SHINE_MS)
  })
}
