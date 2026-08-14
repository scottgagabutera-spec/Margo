'use client'

import { useEffect, useState } from 'react'

export interface VisualViewportMetrics {
  /** visualViewport.height (px), or window.innerHeight fallback */
  height: number
  /** visualViewport.offsetTop */
  offsetTop: number
  /**
   * Distance from the layout viewport bottom to the visual viewport bottom.
   * ≈ on-screen keyboard overlap when the keyboard is open.
   */
  keyboardInset: number
  /** True when keyboardInset clears a small threshold */
  keyboardOpen: boolean
}

const KEYBOARD_OPEN_PX = 80

function readMetrics(): VisualViewportMetrics {
  if (typeof window === 'undefined') {
    return { height: 800, offsetTop: 0, keyboardInset: 0, keyboardOpen: false }
  }
  const vv = window.visualViewport
  const height = vv?.height ?? window.innerHeight
  const offsetTop = vv?.offsetTop ?? 0
  const keyboardInset = Math.max(0, window.innerHeight - height - offsetTop)
  return {
    height,
    offsetTop,
    keyboardInset,
    keyboardOpen: keyboardInset >= KEYBOARD_OPEN_PX,
  }
}

/**
 * Tracks the Visual Viewport (keyboard-aware on iOS Safari + Android Chrome).
 * Optionally publishes CSS vars on <html> for sticky CTAs / sheets:
 *   --margo-vv-height
 *   --margo-keyboard-inset
 */
export function useVisualViewport(options?: { publishCssVars?: boolean }) {
  const publish = options?.publishCssVars ?? true
  const [metrics, setMetrics] = useState<VisualViewportMetrics>(() => readMetrics())

  useEffect(() => {
    const update = () => {
      const next = readMetrics()
      setMetrics(next)
      if (publish && typeof document !== 'undefined') {
        const root = document.documentElement
        root.style.setProperty('--margo-vv-height', `${Math.round(next.height)}px`)
        root.style.setProperty('--margo-keyboard-inset', `${Math.round(next.keyboardInset)}px`)
      }
    }

    update()
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      if (publish) {
        document.documentElement.style.removeProperty('--margo-vv-height')
        document.documentElement.style.removeProperty('--margo-keyboard-inset')
      }
    }
  }, [publish])

  return metrics
}

/**
 * True while an editable field (input/textarea/contenteditable) is focused.
 * Used to hide chrome (e.g. mobile tab bar) and prefer keyboard insets.
 */
export function useTextFieldFocus() {
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false
      const tag = el.tagName
      if (tag === 'TEXTAREA') return true
      if (tag === 'INPUT') {
        const type = (el as HTMLInputElement).type
        return !['button', 'submit', 'checkbox', 'radio', 'file', 'hidden', 'reset', 'image'].includes(type)
      }
      return el.isContentEditable
    }

    const sync = () => setFocused(isEditable(document.activeElement))
    sync()
    document.addEventListener('focusin', sync)
    document.addEventListener('focusout', sync)
    return () => {
      document.removeEventListener('focusin', sync)
      document.removeEventListener('focusout', sync)
    }
  }, [])

  return focused
}

/**
 * Keyboard-safe chrome: visual viewport metrics + html[data-margo-keyboard]
 * for tab-bar hide while a text field is focused or the keyboard is open.
 * No force flags — same path for every Compose step / future form.
 */
export function useKeyboardSafeChrome(enabled = true) {
  const metrics = useVisualViewport({ publishCssVars: enabled })
  const textFocused = useTextFieldFocus()
  const active = enabled && (textFocused || metrics.keyboardOpen)

  useEffect(() => {
    const root = document.documentElement
    if (active) root.setAttribute('data-margo-keyboard', '1')
    else root.removeAttribute('data-margo-keyboard')
    return () => root.removeAttribute('data-margo-keyboard')
  }, [active])

  return { ...metrics, textFocused, chromeHidden: active }
}
