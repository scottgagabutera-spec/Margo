'use client'

import { useEffect, type RefObject } from 'react'

const KEYBOARD_THRESHOLD_PX = 120

function scrollPanelRepliesToTop(panel: HTMLElement) {
  const scroller = panel.querySelector('.margo-post-card__lb-scroll')
  if (scroller instanceof HTMLElement) {
    scroller.scrollTop = 0
  }
}

/** Feed LB panel: fit above keyboard via visualViewport; hide tab bar while keyboard is open. */
export function useLyricBackPanelViewport(
  panelRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) {
      document.documentElement.classList.remove('margo-keyboard-open')
      return
    }

    const panel = panelRef.current
    if (!panel) return

    const vv = window.visualViewport

    const update = () => {
      const el = panelRef.current
      if (!el) return

      const viewportHeight = vv?.height ?? window.innerHeight
      const keyboardOpen = window.innerHeight - viewportHeight > KEYBOARD_THRESHOLD_PX
      document.documentElement.classList.toggle('margo-keyboard-open', keyboardOpen)

      const top = el.getBoundingClientRect().top
      const bottomPad = keyboardOpen ? 8 : 12
      const available = Math.max(160, viewportHeight - top - bottomPad)
      el.style.setProperty('--lb-panel-vvh', `${Math.round(available)}px`)

      if (keyboardOpen) {
        scrollPanelRepliesToTop(el)
      }
    }

    update()
    scrollPanelRepliesToTop(panel)

    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)

    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      document.documentElement.classList.remove('margo-keyboard-open')
      panelRef.current?.style.removeProperty('--lb-panel-vvh')
    }
  }, [enabled, panelRef])
}

export function resetLyricBackPanelScroll(panel: HTMLElement | null): void {
  if (!panel) return
  scrollPanelRepliesToTop(panel)
}
