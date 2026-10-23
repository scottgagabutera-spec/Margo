'use client'

import { useEffect, type RefObject } from 'react'
import {
  LYRIC_BACK_KEYBOARD_MIN_PANEL_PX,
  LYRIC_BACK_KEYBOARD_THRESHOLD_PX,
  lyricBackPinnedPanelCapPx,
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

function clearPanelKeyboardStyle(el: HTMLElement): void {
  el.style.removeProperty('--lb-panel-vvh')
  el.style.removeProperty('max-height')
  el.style.removeProperty('height')
  el.removeAttribute('data-lb-keyboard')
}

/**
 * Cap panel height to visualViewport while the keyboard is open.
 * Stays in document flow (no position:fixed) so horizontal layout cannot drift.
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

      if (!keyboardOpen) {
        clearPanelKeyboardStyle(el)
        return
      }

      const panelTop = el.getBoundingClientRect().top
      const cap = lyricBackPinnedPanelCapPx({
        pinnedTop: panelTop,
        offsetTop,
        viewportHeight,
        bottomPad: 8,
        minHeight: LYRIC_BACK_KEYBOARD_MIN_PANEL_PX,
      })
      if (cap <= 0) {
        clearPanelKeyboardStyle(el)
        return
      }

      el.style.setProperty('--lb-panel-vvh', `${cap}px`)
      el.style.maxHeight = `${cap}px`
      el.setAttribute('data-lb-keyboard', '1')
    }

    update()

    const onPageHide = () => {
      const el = panelRef.current
      if (el) clearPanelKeyboardStyle(el)
    }
    const onVis = () => {
      if (document.visibilityState === 'hidden') onPageHide()
      else update()
    }
    const onFocusIn = (ev: FocusEvent) => {
      const el = panelRef.current
      if (el && isPanelTextField(el, ev.target)) {
        const input = ev.target
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
          try {
            input.focus({ preventScroll: true })
          } catch {
            /* older browsers */
          }
        }
      }
      window.cancelAnimationFrame(focusFrame)
      focusFrame = window.requestAnimationFrame(update)
    }
    const onFocusOut = () => {
      window.cancelAnimationFrame(focusFrame)
      focusFrame = window.requestAnimationFrame(update)
    }

    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVis)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)

    return () => {
      disposed = true
      window.cancelAnimationFrame(focusFrame)
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVis)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      const el = panelRef.current
      if (el) clearPanelKeyboardStyle(el)
    }
  }, [enabled, panelRef])
}
