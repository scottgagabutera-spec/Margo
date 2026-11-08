const RETURN_KEY = 'margo-return-v1'

export type MargoReturnState = {
  href: string
  feedTab?: string | null
  scrollY?: number
  memoriesRowX?: number
  shortsStripX?: number
  anchorId?: string | null
}

export function saveMargoReturn(state: MargoReturnState): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(RETURN_KEY, JSON.stringify(state))
  } catch {
    /* private mode */
  }
}

export function readMargoReturn(): MargoReturnState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(RETURN_KEY)
    if (!raw) return null
    return JSON.parse(raw) as MargoReturnState
  } catch {
    return null
  }
}

export function clearMargoReturn(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(RETURN_KEY)
  } catch {
    /* */
  }
}

export function captureFeedReturnFromDom(): Partial<MargoReturnState> {
  if (typeof document === 'undefined') return {}
  const scroller = document.querySelector('[data-margo-primary-tab="feed"]')
  const memories = document.querySelector('.margo-feed-memories-row__scroller')
  const shorts = document.querySelector('.margo-feed-shorts-strip__row')
  return {
    scrollY: scroller instanceof HTMLElement ? scroller.scrollTop : 0,
    memoriesRowX: memories instanceof HTMLElement ? memories.scrollLeft : 0,
    shortsStripX: shorts instanceof HTMLElement ? shorts.scrollLeft : 0,
  }
}
