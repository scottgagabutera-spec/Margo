'use client'

import { useEffect, type RefObject } from 'react'
import {
  LYRIC_BACK_KEYBOARD_THRESHOLD_PX,
  lyricBackPanelCapPx,
  visualKeyboardInsetPx,
} from '@/lib/lyric-back-keyboard'

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

/**
 * Feed LB panel: cap height to the visual viewport while the keyboard is open.
 * Resize only — do not listen to visualViewport scroll, and do not touch scrollTop.
 */
export function useLyricBackPanelViewport(
  panelRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return

    const panel = panelRef.current
    if (!panel) return

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
        el.style.removeProperty('--lb-panel-vvh')
        el.style.removeProperty('height')
        el.removeAttribute('data-lb-keyboard')
        return
      }

      const cap = lyricBackPanelCapPx({
        elementTop: el.getBoundingClientRect().top,
        offsetTop,
        viewportHeight,
        bottomPad: 8,
      })
      if (cap <= 0) {
        el.style.removeProperty('--lb-panel-vvh')
        el.style.removeProperty('height')
        el.removeAttribute('data-lb-keyboard')
        return
      }
      el.style.setProperty('--lb-panel-vvh', `${cap}px`)
      el.style.height = `${cap}px`
      el.setAttribute('data-lb-keyboard', '1')
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
    window.addEventListener('resize', update)
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVis)
    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', onFocus)

    return () => {
      disposed = true
      window.cancelAnimationFrame(focusFrame)
      vv?.removeEventListener('resize', update)
      window.removeEventListener('resize', update)
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVis)
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', onFocus)
      clearLyricBackKeyboardChrome()
      const el = panelRef.current
      el?.style.removeProperty('--lb-panel-vvh')
      el?.style.removeProperty('height')
      el?.removeAttribute('data-lb-keyboard')
    }
  }, [enabled, panelRef])
}
