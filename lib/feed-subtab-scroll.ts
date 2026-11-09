import {
  alignFeedPrimaryFrozenScroll,
  clearPrimaryTabScroll,
} from '@/components/primary-tab-shell'

/** Zero feed pane scroll for Memories / Shorts / Echoes without touching return-restore APIs. */
export function resetFeedScrollerForContentSubTab(): void {
  if (typeof window === 'undefined') return
  clearPrimaryTabScroll('feed')
  alignFeedPrimaryFrozenScroll(0)

  const apply = () => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    const scroller = document.querySelector('[data-margo-primary-tab="feed"]')
    if (scroller instanceof HTMLElement) {
      scroller.style.overflowAnchor = 'none'
      scroller.scrollTop = 0
      scroller.scrollLeft = 0
    }
  }

  apply()
  requestAnimationFrame(() => {
    apply()
    requestAnimationFrame(apply)
  })
}

export function isFeedContentSubTab(tab: string): tab is 'memories' | 'shorts' | 'echoes' {
  return tab === 'memories' || tab === 'shorts' || tab === 'echoes'
}
