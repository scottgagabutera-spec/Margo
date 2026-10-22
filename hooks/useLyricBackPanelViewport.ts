'use client'

import { useEffect, type RefObject } from 'react'
import {
  LYRIC_BACK_KEYBOARD_MIN_PANEL_PX,
  LYRIC_BACK_KEYBOARD_THRESHOLD_PX,
  lyricBackPinnedPanelCapPx,
  visualKeyboardInsetPx,
} from '@/lib/lyric-back-keyboard'
import {
  feedLyricBackHeadroomTop,
  readFeedLyricBackChromeHeights,
  scrollFeedLyricBackPanelIntoView,
  scrollPostLyricBackSectionIntoView,
} from '@/lib/lyric-back-panel-scroll'

export function clearLyricBackKeyboardChrome(): void {
  const root = document.documentElement
  root.classList.remove('margo-keyboard-open')
  root.removeAttribute('data-margo-keyboard')
}

function isPanelTextField(panel: HTMLElement, el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement) || !panel.contains(el)) return false
  const tag = el.tagName
  if (tag === 'TEXTAREA') return true
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type
    return !['button', 'submit', 'checkbox', 'radio', 'file', 'hidden', 'reset', 'image'].includes(type)
  }
  return el.isContentEditable
}

function setLyricBackKeyboardChrome(active: boolean): void {
  const root = document.documentElement
  root.classList.toggle('margo-keyboard-open', active)
  if (active) root.setAttribute('data-margo-keyboard', '1')
  else root.removeAttribute('data-margo-keyboard')
}

function readPxVar(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name)
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : fallback
}

function pinnedTopForPanel(isFeed: boolean, offsetTop: number): number {
  if (isFeed) return offsetTop + feedLyricBackHeadroomTop(readFeedLyricBackChromeHeights())
  return offsetTop + readPxVar('--nav-height', 72) + 8
}

function clearPanelPin(el: HTMLElement): void {
  el.style.removeProperty('--lb-panel-vvh')
  el.style.removeProperty('height')
  el.style.removeProperty('top')
  el.style.removeProperty('left')
  el.style.removeProperty('width')
  el.style.removeProperty('max-height')
  el.removeAttribute('data-lb-keyboard')
  el.removeAttribute('data-lb-pinned')
}

/**
 * Cap / pin the Lyric Back panel to the visual viewport while the keyboard is open.
 * Resize + visualViewport scroll — do not mutate feed scrollTop here.
 */
export function useLyricBackPanelViewport(
  panelRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  options?: { variant?: 'feed' | 'post' },
) {
  useEffect(() => {
    if (!enabled) return

    const panel = panelRef.current
    if (!panel) return

    const variant = options?.variant ?? (panel.classList.contains('margo-post-detail-lb') ? 'post' : 'feed')
    const isFeed = variant === 'feed'
    const vv = window.visualViewport
    let disposed = false
    let focusFrame = 0

    const update = () => {
      if (disposed) return
      const el = panelRef.current
      if (!el) return

      const viewportHeight = vv?.height ?? window.innerHeight
      const offsetTop = vv?.offsetTop ?? 0
      const keyboardOpen = visualKeyboardInsetPx({
        innerHeight: window.innerHeight,
        viewportHeight,
        offsetTop,
      }) > LYRIC_BACK_KEYBOARD_THRESHOLD_PX
      const textFocused = isPanelTextField(el, document.activeElement)
      setLyricBackKeyboardChrome(keyboardOpen || textFocused)

      if (!keyboardOpen) {
        clearPanelPin(el)
        return
      }

      if (isFeed) scrollFeedLyricBackPanelIntoView(el)
      else scrollPostLyricBackSectionIntoView(el)

      const rect = el.getBoundingClientRect()
      const pinnedTop = pinnedTopForPanel(isFeed, offsetTop)
      const cap = lyricBackPinnedPanelCapPx({
        pinnedTop,
        offsetTop,
        viewportHeight,
        bottomPad: 8,
        minHeight: LYRIC_BACK_KEYBOARD_MIN_PANEL_PX,
      })
      if (cap <= 0) {
        clearPanelPin(el)
        return
      }

      el.style.setProperty('--lb-panel-vvh', `${cap}px`)
      el.style.height = `${cap}px`
      el.style.maxHeight = `${cap}px`
      el.style.top = `${pinnedTop}px`
      el.style.left = `${rect.left}px`
      el.style.width = `${rect.width}px`
      el.setAttribute('data-lb-keyboard', '1')
      el.setAttribute('data-lb-pinned', '1')
    }

    update()

    const onPageHide = () => clearLyricBackKeyboardChrome()
    const onVis = () => {
      if (document.visibilityState === 'hidden') clearLyricBackKeyboardChrome()
      else update()
    }
    const onFocus = () => {
      window.cancelAnimationFrame(focusFrame)
      focusFrame = window.requestAnimationFrame(update)
    }

    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVis)
    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', onFocus)

    return () => {
      disposed = true
      window.cancelAnimationFrame(focusFrame)
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVis)
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', onFocus)
      clearLyricBackKeyboardChrome()
      const el = panelRef.current
      if (el) clearPanelPin(el)
    }
  }, [enabled, panelRef, options?.variant])
}
